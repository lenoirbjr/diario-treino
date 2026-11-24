# Diário Treino

PWA estático, em português, para acompanhar quatro fichas semanais, editar séries, repetições e cargas e registrar o aeróbico.

- A engrenagem troca um exercício só na sessão selecionada. A ficha padrão permanece igual; o histórico conserva o nome executado.
- A aba Evolução mostra o tempo desde o primeiro registro realizado de cada ficha e a maior carga das séries concluídas, por semana, exercício e unidade.
- Sem conta, servidor de dados ou sincronização. Registros e rascunhos ficam no armazenamento local do navegador/app.
- A instalação pelo Safari está em **Compartilhar → Adicionar à Tela de Início**. Abra o app instalado online uma vez para preparar o modo offline.
- Em **Histórico**, exporte um backup JSON antes de trocar de aparelho ou limpar dados. Importar substitui o conteúdo local. O Safari e o ícone instalado podem ter armazenamentos separados.
- O código e as fichas padrão estão no GitHub Pages, mas os dados que você registrar não são enviados ao GitHub.
- Para testar localmente, sirva esta pasta com `python3 -m http.server 8000`.
