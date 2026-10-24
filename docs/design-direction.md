# Aith experience redesign

## Reference and intent

Use the freely available [shadcn/ui authentication blocks](https://ui.shadcn.com/blocks/authentication) as the layout reference: a branded panel paired with a focused form, restrained borders, clear labels, and generous spacing. The implementation is original React and CSS adapted to Aith's authentication playground.

Retain Aith's forest-green identity. Pair white surfaces and warm neutral backgrounds with mint highlights, readable ink text, and a dark response viewer. Avoid imagery that competes with the account task.

## Working experience

- One primary workspace for sign in, account creation, and verification.
- Separate session controls, response inspection, and request activity.
- Useful empty states and recovery for validation, network, and expired-session errors.
- Keyboard navigation, explicit labels, visible focus, reduced motion, and layouts down to 320px.
- Only expose the seven existing authentication endpoints. OAuth, reset-password, and resend-code features are unavailable.

## Delivery

Each change must deliver a real behavior, reusable interface element, accessibility improvement, validation rule, or documented operational requirement. Build each checkpoint and push its commit to GitHub. Integrate the form, inspection, and session work into the final experience, then verify the assembled application in a browser.
