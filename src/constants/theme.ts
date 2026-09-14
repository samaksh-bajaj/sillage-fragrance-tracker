export const colors = {
  mist: '#E9E7EE',
  vitrine: '#F7F6FA',
  ink: '#231A2E',
  smoke: '#6E6679',
  shelf: '#CFCAD8',
  resin: '#B0782A',
  danger: '#A3372F',
} as const;

export const fonts = {
  display: 'Italiana_400Regular',
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
} as const;

export const spacing = {
  gutter: 20,
} as const;

// Notes pyramid bands deepen from top to base, like liquid settling in a bottle.
export const noteBands = {
  top: { background: '#DCD7E4', text: colors.ink, chip: 'rgba(255, 255, 255, 0.55)' },
  heart: { background: '#AEA3BD', text: colors.ink, chip: 'rgba(255, 255, 255, 0.35)' },
  base: { background: '#3B2F4B', text: colors.vitrine, chip: 'rgba(255, 255, 255, 0.12)' },
} as const;
