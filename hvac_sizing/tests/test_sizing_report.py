import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from calc_engine import calculate_project
from sizing_pdf import generate_sizing_pdf, generate_sizing_pdf_languages
from unittest.mock import patch


class SizingReportTests(unittest.TestCase):
    def payload(self, count=1):
        return {'method': 'quick', 'project_name': 'Test <stanza> & ufficio', 'rooms': [
            {'name': f'Locale {i+1}', 'length': 4, 'width': 3, 'height': 2.6,
             'people': 0, 'margin_percent': 10} for i in range(count)]}

    def test_outdoor_totals_and_configurations(self):
        for count, kind in [(1,'Mono-split'),(2,'Dual-split'),(3,'Trial-split'),(4,'Quadri-split'),(5,'Penta-split'),(6,'Più unità esterne / sistema da progettare')]:
            with self.subTest(count=count):
                result = calculate_project(self.payload(count))
                self.assertEqual(result['outdoor']['configuration'], kind)
                self.assertEqual(result['outdoor']['cooling_kw'], result['totals']['cooling_kw'])
                self.assertEqual(result['outdoor']['heating_kw'], result['totals']['heating_kw'])

    def test_language_switch_keeps_snapshot_and_translates_outdoor(self):
        payload = self.payload(3)
        payload['language'] = 'it'
        result = calculate_project(payload)
        with patch('sizing_pdf.generate_sizing_pdf', return_value=b'%PDF-test') as render:
            variants = generate_sizing_pdf_languages(payload, result)
        self.assertEqual(set(variants), {'it','de'})
        it_payload, it_result = render.call_args_list[0].args
        de_payload, de_result = render.call_args_list[1].args
        self.assertEqual(de_payload['language'], 'de')
        self.assertEqual(it_payload['rooms'], de_payload['rooms'])
        self.assertEqual(it_result['totals'], de_result['totals'])
        self.assertIn('Annahme:', de_result['outdoor']['assumption'])
        self.assertIn('Ipotesi:', result['outdoor']['assumption'])
        self.assertEqual(payload['language'], 'it')

    def test_pdf_snapshot_all_methods_and_languages(self):
        for method in ['quick','professional']:
            for language in ['it','de']:
                payload = self.payload(3)
                payload.update(method=method, language=language)
                result = calculate_project(payload)
                pdf = generate_sizing_pdf(payload, result)
                self.assertTrue(pdf.startswith(b'%PDF-'))
                self.assertTrue(pdf.rstrip().endswith(b'%%EOF'))
                self.assertNotIn('pdf_base64', result)

if __name__ == '__main__': unittest.main()
