/**
 * Represents the base number of characters the exponential formatting consumes, excluding the actual
 * exponent value.
 * For example, 1234 -> 1.234e+3 and thus the 3 base characters are:
 *  1. the decimal
 *  2. the "e"
 *  3. the "+" (or "-")
 */
const BASE_NUM_OF_CHARS_FOR_EXPONENTIAL_FORMATTING = 3;

/**
 * Used to restrict the length of numbers displayed in the UI so as to avoid
 * any overflow issues. If the number's string length is less than maxChars,
 * no formatting is applied. Otherwise, we return a string in exponential form
 * with a number of decimal points determined by maxChars.
 * @param number The number to be reformatted for display purposes
 * @param maxChars The maximum number of characters in the string, defaults to 7
 * @returns A string of the number either as-is or in exponential form
 */
export function formatNumberForDisplay(number: number, maxChars: number = 7) {
  const numString = String(number);
  const numStringLength = numString.length;
  if (numStringLength > maxChars) {
    // At this point we need to determine how many exponents there are for the calculation
    // of fractionDigits
    const exponentCharLength = getExponentCharLength(number.toExponential());
    // Check if exponentCharLength + BASE_NUM_OF_CHARS_FOR_EXPONENTIAL_FORMATTING exceeds maxChars
    //  Y: set fractionDigits to 0
    //  N: fractionDigits will be determined based on the two exponent char lengths
    const fractionDigits =
      maxChars >
      BASE_NUM_OF_CHARS_FOR_EXPONENTIAL_FORMATTING + exponentCharLength
        ? maxChars -
          BASE_NUM_OF_CHARS_FOR_EXPONENTIAL_FORMATTING -
          exponentCharLength
        : 0;
    // Return the original number as a string in exponential form with the number of chars
    // past the decimal as determined by fractionDigits
    return number.toExponential(fractionDigits);
  } else {
    return numString;
  }
}

/**
 * A utility function that determines how many digits are in the exponent
 * of a string returned by .toExponential()
 * @param expNumberString The string value returned by .toExponential()
 * @returns The number of exponent characters in the .toExponential() string format
 */
function getExponentCharLength(expNumberString: string) {
  // Split the string at the "e"
  const splitString = expNumberString.split('e');
  // Cast the value of the exponent portion to a number
  const exponent = Number(splitString[1]);
  // Convert the exponent back to a string and grab its length
  const exponentStringLength = String(exponent).length;
  // If the exponent is less than 0, subtract 1 from the length returned
  // because the BASE_NUM_OF_CHARS_FOR_EXPONENTIAL_FORMATTING accounts for
  // the + or - rendered in the string
  return exponentStringLength - (exponent < 0 ? 1 : 0);
}

/**
 * A utility that safely applies Math.log to numerical values
 * @param x A number to process
 * @returns 0 if x is 0 or less; otherwise its logarithmic value
 */
export function safeLog(x: number) {
  if (x <= 0) {
    return 0;
  } else {
    return Math.log(x);
  }
}

export function formatNumber(number: number, sigFigs: number = 2) {
  if (Number.isInteger(number)) {
    return number;
  } else {
    return Number(number.toPrecision(sigFigs));
  }
}
