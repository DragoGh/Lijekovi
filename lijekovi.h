#ifndef LIJEKOVI_H
#define LIJEKOVI_H

#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_LIJEKOVA 10
#define NAZIV_MAX 60
#define NAZIV_DATOTEKE "lijekovi.dat"

// Boje za konzolni ispis (ANSI escape kodovi)
#define COLOR_RESET "\033[0m"
#define COLOR_RED "\033[1;31m"
#define COLOR_GREEN "\033[1;32m"
#define COLOR_YELLOW "\033[1;33m"
#define COLOR_CYAN "\033[1;36m"
#define COLOR_BOLD "\033[1m"

typedef struct {
  int id;                // Jedinstveni identifikator (1-10)
  char naziv[NAZIV_MAX]; // Naziv lijeka
  int dan_pocetka;       // Dan početka korištenja (1-31)
  int mjesec_pocetka;    // Mjesec početka (1-12)
  int godina_pocetka;    // Godina početka (npr. 2026)
  int broj_tableta;      // Ukupno tableta u pakiranju
  int trajanje_dana;     // Trajanje u danima za jedno pakiranje
  int max_podizanja; // Koliko puta se lijek može podići na isti recept (1 - 6)
  int trenutno_podizanje; // Trenutno podizanje (1 do max_podizanja)
  bool aktivan;           // Označava je li zapisi valjan/aktivan
} Lijek;

// Prototipovi funkcija
void inicijaliziraj_bazu(Lijek baze[]);
int ucitaj_lijekove(Lijek baze[], const char *filename);
int spremi_lijekove(Lijek baze[], const char *filename);

int dodaj_lijek(Lijek baze[]);
void prikazi_sve_lijekove(Lijek baze[]);
void evidentiraj_podizanje(Lijek baze[]);
void uredi_lijek(Lijek baze[]);
void obrisi_lijek(Lijek baze[]);

// Pomoćne funkcije
int izracunaj_preostalo_dana(const Lijek *l);
void izracunaj_datum_isteka(const Lijek *l, int *dan, int *mjesec, int *godina);
void dobi_danasnji_datum(int *dan, int *mjesec, int *godina);
bool je_valjan_datum(int d, int m, int g);
void ocisti_ulazni_spremnik(void);

#endif // LIJEKOVI_H
