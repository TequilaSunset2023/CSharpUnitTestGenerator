export function countTokens(str: string): number {
    // Split the string into an array of tokens using a regular expression
    const tokens = str.split(/\s+/);

    // Count the number of elements in the array
    return tokens.length;
}