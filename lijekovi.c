#include "lijekovi.h"

// Očišćuje ulazni spremnik (stdin) nakon scanf-a
void ocisti_ulazni_spremnik(void) {
    int c;
    while ((c = getchar()) != '\n' && c != EOF);
}

// Provjera je li datum valjan
bool je_valjan_datum(int d, int m, int g) {
    if (g < 2000 || g > 2100) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1) return false;

    int dani_u_mjesecu[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    // Provjera prijestupne godine
    if ((g % 4 == 0 && g % 100 != 0) || (g % 400 == 0)) {
        dani_u_mjesecu[1] = 29;
    }
    return d <= dani_u_mjesecu[m - 1];
}

// Dohvaća današnji datum iz sustava
void dobi_danasnji_datum(int *dan, int *mjesec, int *godina) {
    time_t t = time(NULL);
    struct tm tm = *localtime(&t);
    *dan = tm.tm_mday;
    *mjesec = tm.tm_mon + 1;
    *godina = tm.tm_year + 1900;
}

// Pomoćna funkcija za pretvaranje datuma u time_t timestamp (ponoć)
static time_t datum_u_timestamp(int d, int m, int g) {
    struct tm t = {0};
    t.tm_mday = d;
    t.tm_mon = m - 1;
    t.tm_year = g - 1900;
    t.tm_isdst = -1;
    return mktime(&t);
}

// Izračunava datum isteka zaliha dodavanjem trajanje_dana na datum početka
void izracunaj_datum_isteka(const Lijek *l, int *dan, int *mjesec, int *godina) {
    time_t ts_pocetak = datum_u_timestamp(l->dan_pocetka, l->mjesec_pocetka, l->godina_pocetka);
    // 86400 sekundi u jednom danu
    time_t ts_istek = ts_pocetak + ((time_t)l->trajanje_dana * 86400);
    
    struct tm *tm_istek = localtime(&ts_istek);
    if (tm_istek) {
        *dan = tm_istek->tm_mday;
        *mjesec = tm_istek->tm_mon + 1;
        *godina = tm_istek->tm_year + 1900;
    } else {
        *dan = l->dan_pocetka;
        *mjesec = l->mjesec_pocetka;
        *godina = l->godina_pocetka;
    }
}

// Izračunava koliko je preostalo dana do isteka zaliha u odnosu na DANAŠNJI datum
int izracunaj_preostalo_dana(const Lijek *l) {
    int d_danas, m_danas, g_danas;
    dobi_danasnji_datum(&d_danas, &m_danas, &g_danas);

    time_t ts_danas = datum_u_timestamp(d_danas, m_danas, g_danas);

    int d_istek, m_istek, g_istek;
    izracunaj_datum_isteka(l, &d_istek, &m_istek, &g_istek);
    time_t ts_istek = datum_u_timestamp(d_istek, m_istek, g_istek);

    double sekunde = difftime(ts_istek, ts_danas);
    return (int)(sekunde / 86400.0);
}

// Inicijalizacija baze lijekova
void inicijaliziraj_bazu(Lijek baze[]) {
    for (int i = 0; i < MAX_LIJEKOVA; i++) {
        baze[i].id = i + 1;
        baze[i].naziv[0] = '\0';
        baze[i].dan_pocetka = 0;
        baze[i].mjesec_pocetka = 0;
        baze[i].godina_pocetka = 0;
        baze[i].broj_tableta = 0;
        baze[i].trajanje_dana = 0;
        baze[i].max_podizanja = 1;
        baze[i].trenutno_podizanje = 1;
        baze[i].aktivan = false;
    }
}

// Učitava lijekove iz binarne datoteke
int ucitaj_lijekove(Lijek baze[], const char *filename) {
    FILE *fp = fopen(filename, "rb");
    if (!fp) {
        return 0; // Datoteka još ne postoji
    }

    size_t procitano = fread(baze, sizeof(Lijek), MAX_LIJEKOVA, fp);
    fclose(fp);
    return (int)procitano;
}

// Sprema lijekove u binarnu datoteku
int spremi_lijekove(Lijek baze[], const char *filename) {
    FILE *fp = fopen(filename, "wb");
    if (!fp) {
        perror("Pogreška pri otvaranju datoteke za spremanje");
        return -1;
    }

    size_t zapisano = fwrite(baze, sizeof(Lijek), MAX_LIJEKOVA, fp);
    fclose(fp);
    return (int)zapisano;
}

// Dodaje novi lijek
int dodaj_lijek(Lijek baze[]) {
    int slobodan_indeks = -1;
    for (int i = 0; i < MAX_LIJEKOVA; i++) {
        if (!baze[i].aktivan) {
            slobodan_indeks = i;
            break;
        }
    }

    if (slobodan_indeks == -1) {
        printf("\n" COLOR_RED "Dosegnut je maksimalan broj lijekova (10/10)! Ne možete dodati više lijekova." COLOR_RESET "\n");
        return -1;
    }

    Lijek n;
    n.id = slobodan_indeks + 1;
    n.aktivan = true;

    printf("\n" COLOR_CYAN "=== DODAVANJE NOVOG LIJEKA (Slot %d/%d) ===" COLOR_RESET "\n", slobodan_indeks + 1, MAX_LIJEKOVA);

    printf("Unesite naziv lijeka: ");
    if (fgets(n.naziv, sizeof(n.naziv), stdin) != NULL) {
        n.naziv[strcspn(n.naziv, "\r\n")] = '\0';
    }

    if (strlen(n.naziv) == 0) {
        printf(COLOR_RED "Naziv lijeka ne smije biti prazan!" COLOR_RESET "\n");
        return -1;
    }

    // Unos datuma početka
    int d, m, g;
    int danas_d, danas_m, danas_g;
    dobi_danasnji_datum(&danas_d, &danas_m, &danas_g);

    printf("Unesite datum početka uzimanja (DD MM YYYY) [ili pritisnite 0 za danas: %02d.%02d.%d]: ", danas_d, danas_m, danas_g);
    char buf[100];
    if (fgets(buf, sizeof(buf), stdin) != NULL) {
        if (sscanf(buf, "%d %d %d", &d, &m, &g) == 3 && je_valjan_datum(d, m, g)) {
            n.dan_pocetka = d;
            n.mjesec_pocetka = m;
            n.godina_pocetka = g;
        } else {
            // Zadani datum je danas
            n.dan_pocetka = danas_d;
            n.mjesec_pocetka = danas_m;
            n.godina_pocetka = danas_g;
            printf(COLOR_YELLOW "Postavljen je današnji datum: %02d.%02d.%d" COLOR_RESET "\n", danas_d, danas_m, danas_g);
        }
    }

    // Unos broja tableta i trajanja
    printf("Unesite broj tableta u pakiranju (npr. 30): ");
    while (scanf("%d", &n.broj_tableta) != 1 || n.broj_tableta <= 0) {
        ocisti_ulazni_spremnik();
        printf(COLOR_RED "Neispravan unos. Unesite pozitivan broj tableta: " COLOR_RESET);
    }

    printf("Koliko će dana trajati ovo pakiranje (npr. 30): ");
    while (scanf("%d", &n.trajanje_dana) != 1 || n.trajanje_dana <= 0) {
        ocisti_ulazni_spremnik();
        printf(COLOR_RED "Neispravan unos. Unesite pozitivan broj dana: " COLOR_RESET);
    }

    // Ponovljivi recept (1 do 6 puta)
    printf("Koliko puta se ovaj lijek može podići na isti recept (1 do 6): ");
    while (scanf("%d", &n.max_podizanja) != 1 || n.max_podizanja < 1 || n.max_podizanja > 6) {
        ocisti_ulazni_spremnik();
        printf(COLOR_RED "Moguće je unijeti između 1 i 6 podizanja na isti recept. Pokušajte ponovo: " COLOR_RESET);
    }
    ocisti_ulazni_spremnik();

    n.trenutno_podizanje = 1; // Prvo podizanje recepta

    baze[slobodan_indeks] = n;
    printf(COLOR_GREEN "\nLijek '%s' uspješno dodan! (Podizanje %d/%d)" COLOR_RESET "\n", n.naziv, n.trenutno_podizanje, n.max_podizanja);

    return slobodan_indeks;
}

// Prikazuje sve lijekove s detaljnim statusom i upozorenjima
void prikazi_sve_lijekove(Lijek baze[]) {
    int aktivnih = 0;
    printf("\n" COLOR_CYAN COLOR_BOLD "=====================================================================================================" COLOR_RESET "\n");
    printf(COLOR_BOLD " %-3s | %-20s | %-12s | %-12s | %-10s | %-10s | %-15s" COLOR_RESET "\n",
           "ID", "Naziv Lijeka", "Početak", "Istek Zaliha", "Preostalo", "Recept", "Status / Upozorenje");
    printf(COLOR_CYAN "-----------------------------------------------------------------------------------------------------" COLOR_RESET "\n");

    for (int i = 0; i < MAX_LIJEKOVA; i++) {
        if (!baze[i].aktivan) continue;
        aktivnih++;

        Lijek *l = &baze[i];
        int d_istek, m_istek, g_istek;
        izracunaj_datum_isteka(l, &d_istek, &m_istek, &g_istek);

        int preostalo = izracunaj_preostalo_dana(l);

        char podizanje_str[20];
        snprintf(podizanje_str, sizeof(podizanje_str), "%d / %d", l->trenutno_podizanje, l->max_podizanja);

        char datum_pocetka_str[15];
        snprintf(datum_pocetka_str, sizeof(datum_pocetka_str), "%02d.%02d.%d.", l->dan_pocetka, l->mjesec_pocetka, l->godina_pocetka);

        char datum_isteka_str[15];
        snprintf(datum_isteka_str, sizeof(datum_isteka_str), "%02d.%02d.%d.", d_istek, m_istek, g_istek);

        // Određivanje statusa i boje
        if (preostalo < 0) {
            printf(" %-3d | %-20s | %-12s | %-12s | " COLOR_RED "%-10s" COLOR_RESET " | %-10s | " COLOR_RED "[ISTEKLO!] Potrošeno" COLOR_RESET "\n",
                   l->id, l->naziv, datum_pocetka_str, datum_isteka_str, "0 dana", podizanje_str);
        } else if (preostalo <= 7) {
            // Upozorenje 7 dana prije isteka!
            if (l->trenutno_podizanje < l->max_podizanja) {
                printf(" %-3d | %-20s | %-12s | %-12s | " COLOR_YELLOW "%2d dana    " COLOR_RESET " | %-10s | " COLOR_YELLOW "[UPOZORENJE] Naruči/Podigni (%d/%d)" COLOR_RESET "\n",
                       l->id, l->naziv, datum_pocetka_str, datum_isteka_str, preostalo, podizanje_str, l->trenutno_podizanje + 1, l->max_podizanja);
            } else {
                printf(" %-3d | %-20s | %-12s | %-12s | " COLOR_RED "%2d dana    " COLOR_RESET " | %-10s | " COLOR_RED "[UPOZORENJE] Traži Novi Recept!" COLOR_RESET "\n",
                       l->id, l->naziv, datum_pocetka_str, datum_isteka_str, preostalo, podizanje_str);
            }
        } else {
            printf(" %-3d | %-20s | %-12s | %-12s | " COLOR_GREEN "%2d dana    " COLOR_RESET " | %-10s | " COLOR_GREEN "U redu" COLOR_RESET "\n",
                   l->id, l->naziv, datum_pocetka_str, datum_isteka_str, preostalo, podizanje_str);
        }
    }

    if (aktivnih == 0) {
        printf("                       " COLOR_YELLOW "Nema registriranih lijekova." COLOR_RESET "\n");
    }
    printf(COLOR_CYAN "=====================================================================================================" COLOR_RESET "\n");
}

// Obnovi / Evidentiraj novo podizanje lijeka na isti recept
void evidentiraj_podizanje(Lijek baze[]) {
    prikazi_sve_lijekove(baze);

    printf("\nUnesite ID lijeka koji ste podigli: ");
    int id;
    if (scanf("%d", &id) != 1) {
        ocisti_ulazni_spremnik();
        printf(COLOR_RED "Neispravan unos ID-a!" COLOR_RESET "\n");
        return;
    }
    ocisti_ulazni_spremnik();

    int idx = id - 1;
    if (idx < 0 || idx >= MAX_LIJEKOVA || !baze[idx].aktivan) {
        printf(COLOR_RED "Lijek s ID-om %d ne postoji!" COLOR_RESET "\n", id);
        return;
    }

    Lijek *l = &baze[idx];

    if (l->trenutno_podizanje >= l->max_podizanja) {
        printf("\n" COLOR_RED "[PAŽNJA] Iskoristili ste sva podizanja na ovom receptu (%d/%d)!" COLOR_RESET "\n",
               l->trenutno_podizanje, l->max_podizanja);
        printf(COLOR_YELLOW "Morate zatražiti novi recept od liječnika za lijek '%s'." COLOR_RESET "\n", l->naziv);

        printf("Želite li ažurirati ovaj lijek s NOVIM receptom? (1 = Da, 0 = Ne): ");
        int izbor;
        if (scanf("%d", &izbor) == 1 && izbor == 1) {
            ocisti_ulazni_spremnik();
            printf("Unesite novi broj podizanja na novom receptu (1-6): ");
            int nove_max;
            while (scanf("%d", &nove_max) != 1 || nove_max < 1 || nove_max > 6) {
                ocisti_ulazni_spremnik();
                printf(COLOR_RED "Unesite broj između 1 i 6: " COLOR_RESET);
            }
            ocisti_ulazni_spremnik();

            l->max_podizanja = nove_max;
            l->trenutno_podizanje = 1;
            dobi_danasnji_datum(&l->dan_pocetka, &l->mjesec_pocetka, &l->godina_pocetka);

            printf(COLOR_GREEN "Novi recept započet za '%s'! Postavljen na podizanje 1/%d te današnji datum (%02d.%02d.%d)." COLOR_RESET "\n",
                   l->naziv, l->max_podizanja, l->dan_pocetka, l->mjesec_pocetka, l->godina_pocetka);
        } else {
            ocisti_ulazni_spremnik();
        }
        return;
    }

    // Povećaj broj podizanja i ažuriraj datum početka na danas
    l->trenutno_podizanje++;
    dobi_danasnji_datum(&l->dan_pocetka, &l->mjesec_pocetka, &l->godina_pocetka);

    printf(COLOR_GREEN "\n[USPJED] Evidentirano Novo Podizanje Lijeka!" COLOR_RESET "\n");
    printf("Lijek: " COLOR_BOLD "%s" COLOR_RESET "\n", l->naziv);
    printf("Novo stanje recepta: " COLOR_CYAN "%d od %d podizanja" COLOR_RESET "\n", l->trenutno_podizanje, l->max_podizanja);
    printf("Novi datum početka korištenja postavljen na danas: " COLOR_BOLD "%02d.%02d.%d." COLOR_RESET "\n",
           l->dan_pocetka, l->mjesec_pocetka, l->godina_pocetka);
}

// Uređivanje postojećeg lijeka
void uredi_lijek(Lijek baze[]) {
    prikazi_sve_lijekove(baze);

    printf("\nUnesite ID lijeka koji želite urediti: ");
    int id;
    if (scanf("%d", &id) != 1) {
        ocisti_ulazni_spremnik();
        printf(COLOR_RED "Neispravan unos ID-a!" COLOR_RESET "\n");
        return;
    }
    ocisti_ulazni_spremnik();

    int idx = id - 1;
    if (idx < 0 || idx >= MAX_LIJEKOVA || !baze[idx].aktivan) {
        printf(COLOR_RED "Lijek s ID-om %d ne postoji!" COLOR_RESET "\n", id);
        return;
    }

    Lijek *l = &baze[idx];
    printf("\n" COLOR_CYAN "=== UREĐIVANJE LIJEKA: %s ===" COLOR_RESET "\n", l->naziv);

    printf("Novi naziv lijeka [Pritisnite ENTER za zadržavanje '%s']: ", l->naziv);
    char buf[100];
    if (fgets(buf, sizeof(buf), stdin) != NULL) {
        buf[strcspn(buf, "\r\n")] = '\0';
        if (strlen(buf) > 0) {
            strncpy(l->naziv, buf, sizeof(l->naziv) - 1);
        }
    }

    printf("Broj tableta u pakiranju [%d]: ", l->broj_tableta);
    if (fgets(buf, sizeof(buf), stdin) != NULL && strlen(buf) > 1) {
        int val;
        if (sscanf(buf, "%d", &val) == 1 && val > 0) l->broj_tableta = val;
    }

    printf("Trajanje u danima [%d]: ", l->trajanje_dana);
    if (fgets(buf, sizeof(buf), stdin) != NULL && strlen(buf) > 1) {
        int val;
        if (sscanf(buf, "%d", &val) == 1 && val > 0) l->trajanje_dana = val;
    }

    printf("Maksimalno podizanja na recept [%d]: ", l->max_podizanja);
    if (fgets(buf, sizeof(buf), stdin) != NULL && strlen(buf) > 1) {
        int val;
        if (sscanf(buf, "%d", &val) == 1 && val >= 1 && val <= 6) l->max_podizanja = val;
    }

    printf("Trenutno podizanje [%d]: ", l->trenutno_podizanje);
    if (fgets(buf, sizeof(buf), stdin) != NULL && strlen(buf) > 1) {
        int val;
        if (sscanf(buf, "%d", &val) == 1 && val >= 1 && val <= l->max_podizanja) l->trenutno_podizanje = val;
    }

    printf(COLOR_GREEN "Podaci o lijeku '%s' uspješno ažurirani!" COLOR_RESET "\n", l->naziv);
}

// Brisanje lijeka
void obrisi_lijek(Lijek baze[]) {
    prikazi_sve_lijekove(baze);

    printf("\nUnesite ID lijeka koji želite obrisati: ");
    int id;
    if (scanf("%d", &id) != 1) {
        ocisti_ulazni_spremnik();
        printf(COLOR_RED "Neispravan unos ID-a!" COLOR_RESET "\n");
        return;
    }
    ocisti_ulazni_spremnik();

    int idx = id - 1;
    if (idx < 0 || idx >= MAX_LIJEKOVA || !baze[idx].aktivan) {
        printf(COLOR_RED "Lijek s ID-om %d ne postoji!" COLOR_RESET "\n", id);
        return;
    }

    printf(COLOR_YELLOW "Jeste li sigurni da želite obrisati lijek '%s'? (1 = Da, 0 = Ne): " COLOR_RESET, baze[idx].naziv);
    int potvrdio;
    if (scanf("%d", &potvrdio) == 1 && potvrdio == 1) {
        baze[idx].aktivan = false;
        printf(COLOR_GREEN "Lijek je uspješno obrisan." COLOR_RESET "\n");
    } else {
        printf("Brisanje otkazano.\n");
    }
    ocisti_ulazni_spremnik();
}
