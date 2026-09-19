export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        // Collect ALL validation errors, not just the first one.
        // Previously: result.error.issues[0].message  ← only the first issue.
        // Why this matters: a client sending 3 bad fields would need 3 separate
        // round-trips to discover each error one by one. Returning all errors at
        // once lets the client surface every problem in a single request.
        //
        // Each error includes:
        //   field   — the dot-joined path to the invalid field (e.g. "password")
        //   message — the human-readable Zod error message for that field
        const errors = result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));

        return res.status(400).json({ errors });
    }

    // Replace req.body with the Zod-parsed (and potentially coerced/stripped)
    // data so downstream controllers always work with clean, validated input.
    req.body = result.data;
    next();
};