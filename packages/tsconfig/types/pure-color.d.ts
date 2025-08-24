declare module 'pure-color/convert/rgb2hsv' {
  /**
   * Converts RGB color values to HSV
   * @param rgb Array of RGB values [r, g, b] where each value is 0-255
   * @returns Array of HSV values [h, s, v] where h is 0-360, s and v are 0-100
   */
  function rgb2hsv(rgb: [number, number, number]): [number, number, number]
  export = rgb2hsv
}

declare module 'pure-color/convert/hsv2rgb' {
  /**
   * Converts HSV color values to RGB
   * @param hsv Array of HSV values [h, s, v] where h is 0-360, s and v are 0-100
   * @returns Array of RGB values [r, g, b] where each value is 0-255
   */
  function hsv2rgb(hsv: [number, number, number]): [number, number, number]
  export = hsv2rgb
}
