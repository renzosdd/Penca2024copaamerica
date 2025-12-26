const path = require('path');
const ejs = require('ejs');

describe('Dashboard view', () => {
  const tpl = path.join(__dirname, '..', 'views', 'dashboard.ejs');

  it('does not render join form for admin role', async () => {
    const html = await ejs.renderFile(tpl, { user: { role: 'admin', username: 'a' }, pencas: [], debug: false });
    expect(html).not.toContain('id="join"');
  });

  it('renders join form for user role', async () => {
    const html = await ejs.renderFile(tpl, { user: { role: 'user', username: 'u' }, pencas: [], debug: false });
    expect(html).toContain('id="join"');
  });
});
