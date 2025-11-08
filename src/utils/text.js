export function fill(tpl, vars = {}) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
