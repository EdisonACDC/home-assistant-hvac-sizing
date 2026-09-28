(() => {
  const brands = ["Aermec", "Airwell", "Akai", "Argo", "Ariston", "Atlantic", "Aux", "Baxi", "Beko", "Bergen", "Beretta", "Bosch", "Carrier", "Centrometal", "Clivet", "Comfee", "Cooper & Hunter", "Daikin", "De’Longhi", "Daitsu", "Daylux", "Electrolux", "Emmeti", "Ferroli", "Fisher", "Fujitsu", "General", "Gree", "Haier", "Heiko", "Hisense", "Hitachi", "Hokkaido", "Hyundai", "Immergas", "Inventor", "Johnson Controls", "Kaisai", "Kelon", "Kentatsu", "Korel", "LG", "Lennox", "Maxa", "Midea", "Mitsubishi Electric", "Mitsubishi Heavy Industries", "Mundoclima", "Nipon", "Olimpia Splendid", "Panasonic", "Qlima", "Rinnai", "Riello", "Rotex", "Samsung", "Sanyo", "Saunier Duval", "Sharp", "Sinclair", "TCL", "Toshiba", "Toyotomi", "Trane", "Trotec", "Vaillant", "Viessmann", "Vivax", "Whirlpool", "Wolf", "York", "Zephir"];
  const controls = [];
  const de = () => (window.AppI18n?.getLanguage?.() || document.documentElement.lang) === 'de';
  document.querySelectorAll('input[name="machine_brand"]').forEach(input => {
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Marca macchina / Anlagenhersteller');
    ['', ...brands, '__manual__'].forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
    input.before(select);
    input.placeholder = 'Marca / Hersteller';
    const sync = () => {
      const value = input.value.trim();
      const brand = brands.find(item => item.toLowerCase() === value.toLowerCase());
      select.value = brand || (value ? '__manual__' : '');
      input.hidden = select.value !== '__manual__';
      select.options[0].textContent = de() ? 'Hersteller auswählen' : 'Seleziona marchio';
      select.options[select.options.length - 1].textContent = de() ? 'Andere Marke manuell eingeben' : 'Altro marchio: inserisci manualmente';
    };
    select.addEventListener('change', () => {
      const manual = select.value === '__manual__';
      input.hidden = !manual;
      input.value = manual ? '' : select.value;
      input.dispatchEvent(new Event('input', {bubbles:true}));
      if (manual) input.focus();
    });
    input.form?.addEventListener('reset', () => setTimeout(sync, 0));
    controls.push(sync);
    sync();
  });
  window.syncMachineBrands = () => controls.forEach(sync => sync());
  window.addEventListener('app-language-changed', window.syncMachineBrands);
  new MutationObserver(window.syncMachineBrands).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
})();
