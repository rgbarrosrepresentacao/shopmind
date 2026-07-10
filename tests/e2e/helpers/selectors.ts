export const Selectors = {
  login: {
    email: '#email',
    password: '#password',
    submit: 'button[type="submit"]',
  },
  sidebar: {
    dashboard: 'a[href="/dashboard"]',
    pdv: 'a[href="/dashboard/pdv"]',
    caixa: 'a[href="/dashboard/caixa"]',
    compras: 'a[href="/dashboard/compras"]',
    estoque: 'a[href="/dashboard/estoque"]',
    transferencias: 'a[href="/dashboard/estoque/transferencias"]',
    produtos: 'a[href="/dashboard/produtos"]',
    clientes: 'a[href="/dashboard/clientes"]',
    fornecedores: 'a[href="/dashboard/fornecedores"]',
    financeiro: 'a[href="/dashboard/financeiro"]',
    multilojas: 'a[href="/dashboard/multilojas"]',
    usuarios: 'a[href="/dashboard/usuarios"]',
    centroComando: 'a[href="/dashboard/corporativo"]',
    ia: 'a[href="/dashboard/ia"]',
  },
  storeSwitcher: {
    button: 'button:has(svg), .store-switcher-button, [data-testid="store-switcher"]', // Let's check how the StoreSwitcher is identified.
    dropdownItem: (name: string) => `button:has-text("${name}"), div:has-text("${name}")`,
  }
};
