// Sets the SERVICE_URL used in the fetch endpoints to a VITE_SERVICE_URL variable
// defined in a .env file or otherwise falls back to window.location.href
export const SERVICE_URL: string =
  import.meta.env.VITE_SERVICE_URL || window.location.href;

// Sets the number of decimals used in the coordinates display
export const NUMBER_OF_FIXED_COORDINATE_DECIMALS = 5;
