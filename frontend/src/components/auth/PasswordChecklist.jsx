import { getPasswordRequirements } from "../../lib/formValidation";

export default function PasswordChecklist({ value = "" }) {
  return (
    <ul className="auth-requirements" aria-label="Password requirements">
      {getPasswordRequirements(value).map(({ id, label, met }) => (
        <li key={id} className={met ? "auth-requirement-met" : ""}>
          <span className="auth-requirement-mark" aria-hidden="true">{met ? "✓" : "·"}</span>
          <span className="auth-sr-only">{met ? "Met: " : "Required: "}</span>{label}
        </li>
      ))}
    </ul>
  );
}
