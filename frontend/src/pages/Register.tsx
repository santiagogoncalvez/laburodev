import { type FormEvent, useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { authClient } from '@/lib/auth-client';
import styles from './Auth.module.css';

// Códigos de Better Auth → mensajes en español
const ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: 'Ya existe una cuenta con ese email',
  INVALID_EMAIL: 'Email inválido',
  WEAK_PASSWORD: 'La contraseña debe tener al menos 8 caracteres',
};

export default function Register() {
  const emailId = useId();
  const passwordId = useId();

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get(emailId) ?? '');
    const password = String(formData.get(passwordId) ?? '');

    setSubmitting(true);
    const { error: signUpError } = await authClient.signUp.email({
      // Better Auth exige un name en el alta: se deriva del email y el
      // usuario lo completa desde el perfil cuando quiera.
      name: email.split('@')[0],
      email,
      password,
    });
    setSubmitting(false);

    if (signUpError) {
      const code = signUpError.code ?? '';
      setError(ERROR_MESSAGES[code] ?? 'No se pudo crear la cuenta');
      return;
    }

    navigate('/search');
  };

  return (
    <div className={styles.container}>
      <title>Crear cuenta · laburoDev</title>
      <div className={styles.card}>
        <h1 className={styles.title}>Crear Cuenta</h1>
        <p className={styles.subtitle}>
          Regístrate para aplicar a ofertas de trabajo
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
              minLength={8}
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
            {submitting ? 'Creando…' : 'Crear Cuenta'}
          </button>
        </form>

        <p className={styles.footer}>
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className={styles.link}>
            Inicia sesión aquí
          </a>
        </p>
      </div>
    </div>
  );
}
