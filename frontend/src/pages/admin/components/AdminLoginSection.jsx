export default function AdminLoginSection({ loginForm, setLoginForm, onLogin, onBackToCustomer, message }) {
  return (
    <main className="container container-wide">
      <section className="card admin-login-card">
        <h2>Admin Login</h2>
        <input
          placeholder="Username"
          value={loginForm.username}
          onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <input
          type="password"
          placeholder="Password"
          value={loginForm.password}
          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
          autoComplete="current-password"
        />
        <button onClick={onLogin}>Login</button>
        <button type="button" className="button-secondary" onClick={onBackToCustomer}>
          Back to Customer Page
        </button>
        <p className="message">{message}</p>
      </section>
    </main>
  );
}

