import { cva } from 'class-variance-authority'

export const botaoVariants = cva('inline-flex rounded-md px-4 text-sm', {
  variants: {
    variant: {
      padrao: 'bg-primary text-primary-foreground',
      perigo: 'bg-destructive text-primary-foreground'
    }
  },
  defaultVariants: { variant: 'padrao' }
})
