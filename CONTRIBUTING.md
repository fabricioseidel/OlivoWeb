# Contribución a OLIVOMARKET

¡Gracias por tu interés en contribuir a OLIVOMARKET! Este documento te guiará sobre cómo contribuir efectivamente al proyecto.

## 🚀 Cómo Contribuir

### 1. Fork del Proyecto
```bash
# Fork en GitHub y clona tu fork
git clone https://github.com/tu-usuario/PruebaWeb1.git
cd tienda-web
```

### 2. Configurar Entorno
```bash
# Instalar dependencias
npm install

# Configurar base de datos
npx prisma db push

# Ejecutar tests
npm run test
```

### 3. Crear Branch de Feature
```bash
# Crear branch desde main
git checkout -b feature/nombre-feature

# O para bugfix
git checkout -b fix/descripcion-bug
```

## 📋 Estándares de Código

### TypeScript
- Usa TypeScript estricto
- Define interfaces para todos los props
- Evita `any`, usa tipos específicos

### Componentes React
```tsx
// ✅ Bueno
interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ variant, children, onClick }) => {
  return <button className={`btn-${variant}`} onClick={onClick}>{children}</button>;
};

// ❌ Malo
export const Button = (props: any) => {
  return <button>{props.children}</button>;
};
```

### Styling
- Usa Tailwind CSS
- Prefiere utility classes sobre CSS custom
- Mantén consistent design system

### Testing
```tsx
// Todos los componentes deben tener tests
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

## 🐛 Reportar Bugs

### Template de Issue
```markdown
**Descripción del Bug**
Descripción clara y concisa del problema.

**Pasos para Reproducir**
1. Ir a '...'
2. Hacer click en '...'
3. Scrollear hasta '...'
4. Ver error

**Comportamiento Esperado**
Lo que esperabas que pasara.

**Screenshots**
Si aplica, agregar screenshots.

**Información del Sistema:**
- OS: [e.g. Windows 11, macOS 14]
- Browser: [e.g. Chrome 120, Firefox 119]
- Node.js: [e.g. 18.17.0]
```

## 💡 Sugerir Features

### Template de Feature Request
```markdown
**¿Tu feature request está relacionada con un problema?**
Descripción clara del problema. Ej: "Estoy frustrado cuando [...]"

**Solución Propuesta**
Descripción clara de lo que quieres que pase.

**Alternativas Consideradas**
Otras soluciones o features que hayas considerado.

**Contexto Adicional**
Cualquier otro contexto o screenshots sobre la feature request.
```

## 🔄 Pull Request Process

### 1. Antes del PR
```bash
# Asegurate que tests pasan
npm run test

# Verifica linting
npm run lint

# Build exitoso
npm run build
```

### 2. Template de PR
```markdown
## Descripción
Descripción breve de los cambios.

## Tipo de cambio
- [ ] Bug fix (cambio no-breaking que arregla un issue)
- [ ] New feature (cambio no-breaking que agrega funcionalidad)
- [ ] Breaking change (fix o feature que causa que funcionalidad existente no funcione)
- [ ] Documentation update

## ¿Cómo se ha testeado?
Describe los tests que ejecutaste.

## Checklist:
- [ ] Mi código sigue las guidelines del proyecto
- [ ] He realizado self-review de mi código
- [ ] He comentado mi código donde era necesario
- [ ] He actualizado la documentación correspondiente
- [ ] Mis cambios no generan nuevos warnings
- [ ] He agregado tests que prueban que mi fix es efectivo o mi feature funciona
- [ ] Tests unitarios nuevos y existentes pasan localmente
```

### 3. Review Process
- Al menos 1 approval requerido
- Todos los tests deben pasar
- Sin conflictos de merge
- Documentación actualizada si es necesario

## 🎯 Áreas de Contribución

### Frontend
- Nuevos componentes UI
- Mejoras de UX/UI
- Optimizaciones de performance
- Accessibility improvements

### Backend
- Nuevos API endpoints
- Optimizaciones de base de datos
- Security enhancements
- Error handling

### Testing
- Aumentar test coverage
- Integration tests
- E2E tests con Playwright
- Performance testing

### Documentación
- Mejorar README
- Documentar APIs
- Tutorials y guides
- Code comments

## 🏷️ Convenciones de Commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
git commit -m "feat: add product rating system"

# Bug fixes
git commit -m "fix: resolve cart total calculation error"

# Documentation
git commit -m "docs: update API documentation"

# Refactoring
git commit -m "refactor: improve product context performance"

# Tests
git commit -m "test: add unit tests for cart component"
```

## 🆘 ¿Necesitas Ayuda?

- 📖 Revisa la [documentación](README.md)
- 🐛 Busca en [issues existentes](https://github.com/fabricioseidel/PruebaWeb1/issues)
- 💬 Crea un [nuevo issue](https://github.com/fabricioseidel/PruebaWeb1/issues/new)
- 📧 Contacta al maintainer

## 🎉 Reconocimientos

Todos los contributors serán reconocidos en nuestro README. ¡Gracias por hacer mejor OLIVOMARKET!

---

**¡Happy coding! 🚀**
