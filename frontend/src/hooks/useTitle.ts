import { useEffect } from 'react';

/**
 * Hook do dynamicznej zmiany tytułu karty przeglądarki.
 * @param title - Nazwa podstrony
 */
const useTitle = (title: string) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} - FixFlow`;

    // Opcjonalny cleanup: przywraca poprzedni tytuł przy odmontowaniu komponentu
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
};

export default useTitle;
