const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const elements = new Map();
const document = {
  getElementById: id => elements.get(id) || null
};
const context = {
  window: {
    Pronostix: {
      esc: s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])),
      avatarHtml: () => '',
      paymentLabel: status => status,
      app: { innerHTML: '' },
      state: { profile: null }
    }
  },
  document,
  console,
  setTimeout
};
context.global = context;
vm.runInNewContext(fs.readFileSync('js/ui.js', 'utf8'), context, { filename: 'js/ui.js' });

const UI = context.window.PronostixUI;

const html = UI.autocompleteField({
  id: 'team',
  label: 'Equipo',
  items: [
    { id: 'mex', name: 'México' },
    { id: 'fra', name: 'Francia' },
    { id: 'eng', name: 'Inglaterra' }
  ],
  selected: null,
  placeholder: 'Ej. México'
});

assert(html.includes('list="team-options"'), 'Renderiza datalist asociado');
assert(html.includes('data-id="mex"'), 'Incluye ID de México');
assert(html.includes('México'), 'Incluye etiqueta México');

const hidden = { value: '' };
const options = [
  { value: 'México', dataset: { id: 'mex' } },
  { value: 'Francia', dataset: { id: 'fra' } },
  { value: 'Inglaterra', dataset: { id: 'eng' } }
];
elements.set('team', hidden);
elements.set('team-options', { options });

const input = { value: 'francia', dataset: { autocompleteTarget: 'team', autocompleteList: 'team-options' } };
UI.syncAutocomplete(input);
assert.strictEqual(hidden.value, 'fra', 'Sin distinguir mayúsculas/minúsculas selecciona Francia');

input.value = 'fran';
UI.syncAutocomplete(input);
assert.strictEqual(hidden.value, '', 'Texto parcial no exacto no se guarda como ID válido');

input.value = 'Equipo inventado';
UI.syncAutocomplete(input);
assert.strictEqual(hidden.value, '', 'Texto libre inválido no se guarda');

console.log('Autocomplete: OK');
