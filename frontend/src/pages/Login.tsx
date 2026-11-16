import { type FormEvent, useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { authClient } from '@/lib/auth-client';
import styles from './Auth.module.css';

// Códigos de Better Auth → mensajes en español
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Email o contraseña incorrectos',
  INVALID_EMAIL: 'Email inválido',
  WEAK_PASSWORD: 'La contraseña debe tener al menos 8 caracteres',
};

export default function Login() {
  const navigate = useNavigate();
  const passwordId = useId();
  const emailId = useId();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get(emailId) ?? '');
    const password = String(formData.get(passwordId) ?? '');

    setSubmitting(true);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setSubmitting(false);

    if (signInError) {
      const code = signInError.code ?? '';
      setError(ERROR_MESSAGES[code] ?? 'No se pudo iniciar sesión');
      return;
    }

    navigate('/search');
  };

  return (
    <div className={styles.container}>
      <title>Iniciar sesión · laburoDev</title>
      <div className={styles.card}>
        <h1 className={styles.title}>Iniciar Sesión</h1>
        <p className={styles.subtitle}>
          Accede a tu cuenta para aplicar a ofertas
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor={emailId} className={styles.label}>
              Email
            </label>
            <input
              id={emailId}
              type="email"
              name={emailId}
              className={styles.input}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={passwordId} className={styles.label}>
              Contraseña
            </label>
            <input
              id={passwordId}
              name={passwordId}
              type="password"
              className={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? 'Entrando…' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className={styles.footer}>
          ¿No tienes cuenta?{' '}
          <a href="/register" className={styles.link}>
            Regístrate aquí
          </a>
        </p>
      </div>
    </div>
  );
}
