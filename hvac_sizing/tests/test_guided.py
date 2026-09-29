import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from calc_engine import calculate_project

class GuidedTests(unittest.TestCase):
    def setUp(self):
        self.room = dict(name='Esempio', length=4, width=3, height=2.6,
            guided_heat=21, guided_cool=26, guided_insulation='good',
            guided_walls=['same','outside','same','same'], guided_attic='no',
            guided_above='same', guided_below='same', people=2, lighting_w=50,
            equipment_w=100, margin_percent=0,
            guided_windows=[dict(width=170,height=110,glass='double_old',orientation='w',shade='none',position='wall')])
        self.climate=dict(winter_outdoor_c=-10,summer_outdoor_c=35,summer_outdoor_rh=50,summer_indoor_rh=50)
    def calc(self, room=None):
        return calculate_project(dict(method='guided',climate=self.climate,rooms=[room or self.room]))['rooms'][0]
    def test_geometry(self):
        r=self.calc()
        self.assertEqual(r['guided_details']['Pareti esterne nette m²'],5.93)
        self.assertEqual(r['guided_details']['Finestre m²'],1.87)
        self.assertEqual(r['volume_m3'],31.2)
        self.assertEqual(r['guided_details']['Tetto verso esterno m²'],0)
        # UA deltaT + ventilation, no margin and no losses through heated neighbours.
        self.assertAlmostEqual(r['heating_w'],(5.93*.3+1.87*2.8+.335*31.2*.5)*31,delta=1)
    def test_temperature_and_glazing_affect_output(self):
        base=self.calc()
        self.room['guided_heat']=24
        self.assertGreater(self.calc()['heating_w'],base['heating_w'])
        self.room['guided_cool']=22
        self.assertGreater(self.calc()['total_cooling_w'],base['total_cooling_w'])
        self.room['guided_heat']=21
        self.room['guided_windows'][0]['glass']='triple'
        self.assertLess(self.calc()['heating_w'],base['heating_w'])
    def test_shade(self):
        base=self.calc();self.room['guided_windows'][0]['shade']='external'
        r=self.calc();self.assertLess(r['total_cooling_w'],base['total_cooling_w']);self.assertEqual(r['heating_w'],base['heating_w'])
    def test_attic_and_cold_neighbours(self):
        base=self.calc();self.room.update(guided_attic='yes',guided_roof_area=15)
        self.assertGreater(self.calc()['heating_w'],base['heating_w'])
        self.assertGreater(self.calc()['total_cooling_w'],base['total_cooling_w'])
        self.room.update(guided_attic='no',guided_below='unheated')
        self.assertGreater(self.calc()['heating_w'],base['heating_w'])
    def test_reject_invalid(self):
        for key,value in [('guided_walls',['unknown']*4),('guided_heat',''),('width',float('nan'))]:
            r=copy.deepcopy(self.room);r[key]=value
            with self.assertRaises(ValueError):self.calc(r)
        self.room['guided_windows'][0]['width']=999
        with self.assertRaises(ValueError):self.calc()
    def test_zero_windows_and_independent_rooms(self):
        self.room['guided_windows']=[]
        self.assertEqual(self.calc()['guided_details']['Finestre m²'],0)
        second=copy.deepcopy(self.room);second['guided_heat']=25
        results=calculate_project(dict(method='guided',climate=self.climate,rooms=[self.room,second]))
        self.assertGreater(results['rooms'][1]['heating_w'],results['rooms'][0]['heating_w'])
        self.assertEqual(results['totals']['heating_w'],sum(x['heating_w'] for x in results['rooms']))

if __name__=='__main__':unittest.main()
