// src/styles/GlobalStyles.ts
import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  :root {
    /* Paleta de Cores Verde */
    --bs-primary: #1fac4b;
    --bs-primary-dark: #17963f;
    --bs-primary-light: #e9f6ec;
    
    /* Cores de Status */
    --bs-secondary: #a5a6a7;
    --bs-success: #1fac4b;
    --bs-danger: #e22f36;
    --bs-warning: #ffc200;
    
    /* Escala de Cinzas */
    --bs-white: #ffffff;
    --bs-gray-015: #f8f9fa;
    --bs-gray-100: #f1f3f5;
    --bs-gray-200: #e9ecef;
    --bs-gray-700: #495057;
    --bs-gray-800: #343a40;
    --bs-gray-900: #212529;
    
    /* Cores de Texto e Fundo */
    --bs-body-color: var(--bs-gray-800);
    --bs-body-bg: var(--bs-gray-015);

    /* Métricas */
    --sidebar-width: 60px;
    --menu-width: 230px;
    --bs-border-color: #dee2e6;
    --bs-border-radius: 0.375rem; /* 6px */
    --bs-border-radius-lg: 0.5rem; /* 8px */
    --bs-border-radius-xl: 8px;
    --bs-box-shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* ALTERAÇÃO: Adicionado para rolagem suave em toda a página */
  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: var(--bs-body-color);
    background-color: var(--bs-body-bg);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a {
    color: var(--bs-primary);
    text-decoration: none;
    transition: filter 0.15s ease-in-out;
    &:hover {
      filter: brightness(0.9);
    }
  }
`;