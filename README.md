# Firma z NIP (REGON)

Aplikacja do [Twenty CRM](https://twenty.com), która tworzy i uzupełnia firmy na podstawie polskiego NIP-u. Dane pobiera z rejestru REGON (GUS, BIR1) oraz z Białej Listy podatników VAT (Ministerstwo Finansów).

## Funkcje

- **Dodaj firmę z NIP** – przycisk na liście firm: wpisujesz NIP, aplikacja pobiera dane i tworzy rekord `Company`. Jeśli firma z takim NIP-em już istnieje, otwiera istniejący rekord zamiast tworzyć duplikat.
- **Pobierane dane** – nazwa, adres, REGON, KRS, forma prawna, główny PKD, data rozpoczęcia działalności i status VAT.
- **Dodatkowe pola w `Company`** – NIP, REGON, KRS, forma prawna, PKD, data startu, status VAT.
- **Walidacja NIP-u przy zapisie** – po utworzeniu lub edycji firmy aplikacja sprawdza sumę kontrolną. Poprawny NIP jest normalizowany do 10 cyfr, błędny jest czyszczony, a do firmy dodawana jest notatka z informacją o tym.
- **Odporność na awarie** – REGON jest źródłem podstawowym. Biała Lista i raporty szczegółowe (PKD) są opcjonalne: gdy zawiodą, dostajesz ostrzeżenie, a reszta danych i tak zostaje zapisana.

## Konfiguracja

Po zainstalowaniu aplikacji ustaw jej zmienne w ustawieniach aplikacji:

| Zmienna | Opis |
| --- | --- |
| `REGON_API_KEY` | Klucz API REGON (BIR1) z GUS. Wymagany. |
| `REGON_ENV` | `test` (domyślnie) albo `prod`. Klucz musi pasować do wybranego środowiska. |

Biała Lista VAT jest publiczna i nie wymaga klucza.

## Rozwój

Instrukcja uruchomienia lokalnie jest w [SETUP.md](SETUP.md). Najważniejsze komendy:

```bash
yarn twenty docker:start   # lokalny serwer Twenty
yarn twenty dev            # synchronizacja aplikacji
yarn lint
yarn typecheck
yarn test:unit
```

Architektura i konwencje projektu: [CLAUDE.md](CLAUDE.md).

## Publikowanie

Workflow `Publish` (`.github/workflows/publish.yml`) publikuje aplikację w npm z provenance, używając [npm trusted publishing](https://docs.npmjs.com/trusted-publishers). Aby opublikować:

1. Na npmjs.com zarejestruj to repozytorium jako trusted publisher pakietu, wskazując workflow `publish.yml`.
2. Podbij wersję w `package.json`, następnie wypchnij tag wersji (np. `git tag v1.0.0 && git push --tags`) albo uruchom workflow ręcznie z zakładki Actions.

Publikacja z provenance służy też do udowodnienia własności aplikacji przy zgłaszaniu jej w marketplace Twenty.

## Zmiany

Lista zmian: [CHANGELOG.md](CHANGELOG.md).

## Więcej informacji

- [Dokumentacja aplikacji Twenty](https://docs.twenty.com/developers/extend/apps/getting-started/quick-start)
- [Dokumentacja CLI twenty-sdk](https://www.npmjs.com/package/twenty-sdk)
- [Discord](https://discord.gg/cx5n4Jzs57)
