# Modelo de dados estruturados (JSON-LD) para negócio local

Colocar no `<head>` do HTML entregue (não injetar só por JavaScript). Usar o tipo mais específico:
`HairSalon`, `BeautySalon`, `NailSalon`, `DaySpa`, `Restaurant`, `Dentist`, `AutoRepair`, `MovingCompany`...
(todos herdam de `LocalBusiness`; lista em schema.org/LocalBusiness). Só fatos confirmados.

```json
{
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "@id": "https://SITE/#negocio",
  "name": "Nome do negócio",
  "url": "https://SITE/",
  "image": ["https://SITE/og.jpg"],
  "telephone": "+55-14-90000-0000",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rua Exemplo, 123",
    "addressLocality": "Cidade",
    "addressRegion": "SP",
    "postalCode": "00000-000",
    "addressCountry": "BR"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": -22.0, "longitude": -49.9 },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "opens": "08:00", "closes": "19:00" }
  ],
  "areaServed": [{ "@type": "City", "name": "Cidade" }],
  "sameAs": ["https://www.instagram.com/perfil", "https://maps.google.com/?cid=..."],
  "founder": { "@type": "Person", "name": "Nome", "jobTitle": "Fundadora" }
}
```

Cuidados (2026): `aggregateRating`/`review` só se as avaliações estiverem na página e forem reais (o Google
não mostra estrelas de avaliação própria para LocalBusiness); não prometer destaque de FAQ a salão
(recurso restrito a sites governamentais/de saúde na documentação do Google); HowTo descontinuado.
Não copiar placeholders ou horários de exemplo para o cliente. Validar no Teste de pesquisa aprimorada do Google ou em
validator.schema.org.

## Exemplos por ramo (tipos conferidos em schema.org em 10/11/2026)
Existem: `FurnitureStore` (Store > LocalBusiness), `HomeAndConstructionBusiness` (LocalBusiness; subtipos como
`GeneralContractor`, sem tipo próprio de marcenaria na página), `ClothingStore` (Store > LocalBusiness).
**`BridalShop` não existe** (schema.org respondeu 404): para loja de noivas, usar `ClothingStore`. Não verificado:
se há tipo mais específico para marceneiro/marcenaria fora dessa lista.
Google (Local business structured data): **obrigatórios** `name` e `address`; **recomendados** `geo`,
`openingHoursSpecification`, `telephone`, `url`, `priceRange`, entre outros. Os demais campos são os do modelo acima.

Marcenaria / móveis planejados (loja ou fábrica com atendimento ao público):
```json
{ "@context": "https://schema.org", "@type": "FurnitureStore", "@id": "https://SITE/#negocio",
  "name": "Nome da marcenaria", "url": "https://SITE/", "image": ["https://SITE/og.jpg"],
  "telephone": "+55-14-90000-0000",
  "address": { "@type": "PostalAddress", "streetAddress": "Rua Exemplo, 123", "addressLocality": "Cidade", "addressRegion": "SP", "postalCode": "00000-000", "addressCountry": "BR" },
  "areaServed": [{ "@type": "City", "name": "Cidade" }],
  "makesOffer": [{ "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Cozinha planejada" } }] }
```
Sem atendimento ao público (só obra no cliente), usar `HomeAndConstructionBusiness` no lugar de `FurnitureStore`.

Loja de vestidos de noiva:
```json
{ "@context": "https://schema.org", "@type": "ClothingStore", "@id": "https://SITE/#negocio",
  "name": "Nome da loja", "url": "https://SITE/", "image": ["https://SITE/og.jpg"],
  "telephone": "+55-14-90000-0000",
  "address": { "@type": "PostalAddress", "streetAddress": "Rua Exemplo, 123", "addressLocality": "Cidade", "addressRegion": "SP", "postalCode": "00000-000", "addressCountry": "BR" },
  "areaServed": [{ "@type": "City", "name": "Cidade" }],
  "description": "Vestidos de noiva e de festa, com prova agendada." }
```
Não incluir `aggregateRating`/`review` do próprio negócio: o Google não mostra estrelas quando o negócio controla as
avaliações ([review snippet](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)).
Acrescentar `geo`, `openingHoursSpecification` e `sameAs` do modelo geral quando confirmados.
