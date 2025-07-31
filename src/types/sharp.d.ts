// Dentro de src/types/sharp.d.ts
declare module 'sharp' {
  const sharp: any; // Declara 'sharp' como tipo 'any'
  export = sharp; // Adequado para a importação 'import * as sharp from 'sharp';'
}
