# watson-lib (opcional)

Utilitário em Python (só biblioteca padrão, Python 3.9+) para trabalhar com a **biblioteca do Watson** e com
**casos exportados** pelo Sherlock, sem precisar do site.

> O Assistente Watson dentro do site roda em TypeScript no mesmo servidor do Sherlock e **não depende** deste
> script. Python aqui é um complemento para o seu computador.

```powershell
python watson_lib.py validate                      # confere prisma/library/entries.json
python watson_lib.py search "cadeia de custodia"   # busca na biblioteca
python watson_lib.py export-csv biblioteca.csv     # edite no Excel (separador ;)
python watson_lib.py import-csv biblioteca.csv     # mescla por slug e valida antes de gravar
python watson_lib.py export-md biblioteca.md       # versão para leitura/impressão
python watson_lib.py check-case CAS-2026-0001-pacote.zip   # lacunas (subconjunto das regras)
python watson_lib.py compare caso-a.json caso-b.json       # hashes em comum entre dois casos
```

Depois de alterar a biblioteca, rode `npm run prisma:seed` para carregá-la no banco (itens padrão são atualizados
por `slug`; itens criados no site não são tocados).
