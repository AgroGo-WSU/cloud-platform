export async function validateCompleteEntries(
    entries: Record<string, any>[],
    requiredFields: string[]
) {
    const invalidEntries = [];

    // Ensure that every has all needed fields
    for(const entry of entries) {
        const missing = requiredFields.filter(
            f => entry[f] === undefined
        );

        if(missing.length > 0) invalidEntries.push({ entry, missing});
    }

    if(invalidEntries.length > 0) return { valid: false, invalidEntries}

    return { valid: true };
}