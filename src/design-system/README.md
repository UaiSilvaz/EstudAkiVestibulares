# Silva Educacional

Os componentes compartilham tokens em `tokens.css`. `public.css` organiza landing,
login e carregamento; `details.css` define profundidade, cards e movimento.
`workspace.css` aplica a composição do HTML Silva V5: navegação lateral compacta,
cabeçalho com preparação, roteiro de estudo, indicadores e cards ilustrados.
Inter é a fonte de interface e Manrope a de títulos.

- `src/config/tracks.ts` concentra as seis paletas e sua relação com as preparações.
  ENEM é uma apresentação própria da vertical vestibular; Medicina mantém sua
  identidade mesmo quando a prova escolhida é o ENEM.
- `TrackProvider` acompanha a preparação confirmada pelo servidor. `silva-track`
  registra a preferência local, mas não substitui a preparação da conta. A troca
  usa a API existente e `router.refresh()`, sem recarregar o documento.
- `--brand` serve a texto e ícones; `--brand-button` mantém a cor de fundo dos
  botões com texto branco, inclusive no tema escuro.
- Animações de entrada, hover e progresso respeitam `prefers-reduced-motion`.
- Cookies e chaves antigas de autenticação e preferências permanecem compatíveis.

`SilvaBrand` usa o lettering original extraído do PNG embutido no HTML fornecido,
em `public/brand/silva-logo-white.png`. Uma máscara CSS permite aplicações brancas,
monocromáticas e com o gradiente institucional sem alterar o desenho. O favicon
utiliza um monograma próprio em SVG.

`SilvaIllustration` reúne onze ilustrações SVG adaptadas da referência. As partes
animadas respondem a hover e foco, com suporte a movimento reduzido. O catálogo de
disciplinas tem filtros locais e busca sem acentos; contagens e acertos vêm do banco.
O dashboard mantém as recomendações, retomada de curso e plano reais. Os números
demonstrativos e scripts de simulação do HTML não fazem parte da aplicação.

Validação de trilhas: `npm run test:tracks`. Validação geral: `npm run verify`.
