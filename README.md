# Gestão da Quinta — Apanha da Fruta

Aplicação web para gestão de uma quinta agrícola durante a temporada de apanha
de fruta (agosto): chamada diária, grupos, produção por pomar, stock de
palotes, entregas à cooperativa, salários semanais e histórico de pomares.

## Como usar

Basta abrir o ficheiro `index.html` num browser moderno (Chrome, Edge, Firefox,
Safari). Não precisa de servidor nem de instalação.

Em alternativa, pode servir a pasta localmente:

```bash
cd gestao-quinta
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Dados

- Por defeito, os dados são guardados no **localStorage do browser** —
  persistem entre sessões no mesmo computador e browser (modo local).
- Com o **Firebase Firestore** configurado (ver abaixo), os dados são
  partilhados **em tempo real** entre todos os computadores que tenham o
  mesmo "código da quinta".

## Partilha em tempo real (Firebase, plano gratuito Spark)

1. Criar um projeto em https://console.firebase.google.com (conta Google,
   sem cartão de crédito).
2. Ativar o **Firestore Database** (modo de produção) e a autenticação
   **Anónima** (Authentication → Sign-in method → Anonymous).
3. Nas regras do Firestore, colar:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /quintas/{quintaId}/docs/{docId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. Registar uma app Web no projeto e copiar o objeto `firebaseConfig`
   para `js/firebase-config.js` (atribuir a `window.FIREBASE_CONFIG`).
5. Abrir a app → botão "☁️ Ativar partilha" no topo → **Criar quinta nova**.
   Partilhar o código gerado com a família; nos outros computadores usar
   "Já tenho um código".

A proteção dos dados assenta no código da quinta (aleatório e impossível de
adivinhar) + autenticação anónima: sem o código, ninguém encontra os dados.
A configuração do Firebase em `js/firebase-config.js` não é secreta.
- Faça regularmente uma **cópia de segurança** (Configuração → Cópia de
  segurança → Descarregar JSON). Pode repor a cópia em qualquer altura.
- Limpar os dados do browser apaga os dados da aplicação.

## Primeiros passos numa temporada

1. **Configuração** — definir o valor diário do trabalhador e do líder,
   confirmar as variedades (Pera Rocha 250 kg/palote; maçãs 280 kg/palote)
   e criar os pomares ativos (cada pomar tem uma variedade).
2. **Trabalhadores** — registar os trabalhadores diretos (a app reconhece
   automaticamente nomes de anos anteriores) e as empresas externas.
3. **Grupos** — criar os grupos da semana, cada um com um líder e os seus
   trabalhadores.
4. No dia a dia: **Chamada** (presenças), **Produção** (palotes por grupo e
   pomar, vários lotes por dia), **Stock & Entregas** (entregas à cooperativa).
5. Ao sábado: **Salários** (cálculo automático da semana) e **Exportar**
   (relatórios Excel de salários e produção).
6. No fim da temporada: Configuração → **Fechar temporada** — guarda o
   histórico de pomares e de trabalhadores e permite criar a temporada
   seguinte.

## Estrutura

- `index.html` — página única da aplicação
- `css/estilo.css` — estilos
- `js/utils.js` — utilitários (datas, formatação, etc.)
- `js/dados.js` — camada de dados (localStorage) e cálculos
- `js/ui.js` — componentes de interface (toast, modal)
- `js/vista-*.js` — cada ecrã da aplicação
- `js/app.js` — navegação e arranque
