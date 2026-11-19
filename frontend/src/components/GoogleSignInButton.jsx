import React, { useEffect, useRef } from 'react';

export default function GoogleSignInButton({ clientId, onCredential, onError }) {
  const buttonRef = useRef(null);
  const credentialHandler = useRef(onCredential);
  const errorHandler = useRef(onError);

  useEffect(() => {
    credentialHandler.current = onCredential;
    errorHandler.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return undefined;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) {
        errorHandler.current?.('Google sign-in could not be loaded.');
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => credentialHandler.current?.(credential),
        auto_select: false,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 320,
      });
    };
    script.onerror = () => errorHandler.current?.('Google sign-in could not be loaded.');
    document.head.appendChild(script);

    return () => {
      script.remove();
      if (buttonRef.current) buttonRef.current.replaceChildren();
    };
  }, [clientId]);

  return <div ref={buttonRef} className="flex justify-center min-h-10" />;
}
