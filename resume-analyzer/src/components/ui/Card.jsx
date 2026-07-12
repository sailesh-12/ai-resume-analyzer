/**
 * components/ui/Card.jsx  [Phase 4]
 *
 * Base card container with optional header, body, and footer slots.
 * Usage:
 *   <Card>
 *     <Card.Header title="AI Quality Report" subtitle="..." icon="📋" />
 *     <Card.Body>content</Card.Body>
 *   </Card>
 */

function CardRoot({ children, className = '', ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon }) {
  return (
    <div className="card__header">
      {icon && <span className="card__icon" aria-hidden="true">{icon}</span>}
      <div>
        {title    && <h3 className="card__title">{title}</h3>}
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

function CardBody({ children, className = '' }) {
  return <div className={`card__body ${className}`}>{children}</div>;
}

function CardFooter({ children }) {
  return <div className="card__footer">{children}</div>;
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body:   CardBody,
  Footer: CardFooter,
});
