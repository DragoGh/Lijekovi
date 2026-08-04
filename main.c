#include "lijekovi.h"

static void ispisi_zaglavlje(Lijek baze[]) {
    int d, m, g;
    dobi_danasnji_datum(&d, &m, &g);

    int aktivnih = 0;
    int upozorenja = 0;

    for (int i = 0; i < MAX_LIJEKOVA; i++) {
        if (baze[i].aktivan) {
            aktivnih++;
            int preostalo = izracunaj_preostalo_dana(&baze[i]);
            if (preostalo <= 7) {
                upozorenja++;
            }
        }
    }

    printf("\033[H\033[J"); // Čisti ekran (ANSI clear screen)
    printf(COLOR_CYAN COLOR_BOLD "=====================================================================" COLOR_RESET "\n");
    printf(COLOR_BOLD "         APLIKACIJA ZA PRAĆENJE I NARUČIVANJE LIJEKOVA               " COLOR_RESET "\n");
    printf(COLOR_CYAN "=====================================================================" COLOR_RESET "\n");
    printf(" Današnji datum: " COLOR_BOLD "%02d.%02d.%d." COLOR_RESET "\n", d, m, g);
    printf(" Registrirani lijekovi: " COLOR_BOLD "%d / %d" COLOR_RESET "\n", aktivnih, MAX_LIJEKOVA);

    if (upozorenja > 0) {
        printf(" Status upozorenja: " COLOR_RED COLOR_BOLD "[ %d LIJEK/A TREBA NARUČITI U SLJEDEĆIH 7 DANA! ]" COLOR_RESET "\n", upozorenja);
    } else {
        printf(" Status upozorenja: " COLOR_GREEN "Sve zalihe lijekova su stabilne." COLOR_RESET "\n");
    }
    printf(COLOR_CYAN "--------------------------------------------------------------------=" COLOR_RESET "\n");
}

static void ispisi_izbornik(void) {
    printf("\n" COLOR_BOLD "ODABERITE OPCIJU:" COLOR_RESET "\n");
    printf(" 1. Pregled svih lijekova i status zaliha\n");
    printf(" 2. Dodaj novi lijek\n");
    printf(" 3. Evidentiraj podizanje lijeka na recept (Obnova zalihe)\n");
    printf(" 4. Uredi postojeći lijek\n");
    printf(" 5. Obriši lijek\n");
    printf(" 6. Spremi i izađi iz programa\n");
    printf(COLOR_CYAN "--------------------------------------------------------------------=" COLOR_RESET "\n");
    printf("Vaš izbor: ");
}

int main(void) {
    Lijek baze[MAX_LIJEKOVA];
    inicijaliziraj_bazu(baze);

    // Učitaj lijekove ako postoje
    ucitaj_lijekove(baze, NAZIV_DATOTEKE);

    int izbor = 0;
    while (1) {
        ispisi_zaglavlje(baze);
        ispisi_izbornik();

        if (scanf("%d", &izbor) != 1) {
            ocisti_ulazni_spremnik();
            continue;
        }
        ocisti_ulazni_spremnik();

        switch (izbor) {
            case 1:
                prikazi_sve_lijekove(baze);
                printf("\nPritisnite ENTER za povratak u glavni meni...");
                getchar();
                break;
            case 2:
                dodaj_lijek(baze);
                spremi_lijekove(baze, NAZIV_DATOTEKE);
                printf("\nPritisnite ENTER za nastavak...");
                getchar();
                break;
            case 3:
                evidentiraj_podizanje(baze);
                spremi_lijekove(baze, NAZIV_DATOTEKE);
                printf("\nPritisnite ENTER za nastavak...");
                getchar();
                break;
            case 4:
                uredi_lijek(baze);
                spremi_lijekove(baze, NAZIV_DATOTEKE);
                printf("\nPritisnite ENTER za nastavak...");
                getchar();
                break;
            case 5:
                obrisi_lijek(baze);
                spremi_lijekove(baze, NAZIV_DATOTEKE);
                printf("\nPritisnite ENTER za nastavak...");
                getchar();
                break;
            case 6:
                spremi_lijekove(baze, NAZIV_DATOTEKE);
                printf("\n" COLOR_GREEN "Podaci su uspješno spremljeni u datoteku '%s'. Doviđenja!" COLOR_RESET "\n", NAZIV_DATOTEKE);
                return 0;
            default:
                printf(COLOR_RED "Neispravan izbor. Pokušajte ponovo." COLOR_RESET "\n");
                break;
        }
    }

    return 0;
}
