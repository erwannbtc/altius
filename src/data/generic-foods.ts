// Aliments génériques courants (valeurs pour 100 g, ou 100 ml pour les boissons).
// Valeurs typiques arrondies, cohérentes avec la table ANSES CIQUAL.
// kcal ≈ 4 × protéines + 4 × glucides + 9 × lipides (+ ~2 kcal/g de fibres).
// Exception : boissons alcoolisées (l'alcool apporte ~7 kcal/g, non listé ici).

export interface GenericFood {
  id: string; // slug stable préfixé "gen-", ex. "gen-poulet-blanc-cuit"
  name: string; // nom français, ex. "Blanc de poulet, cuit"
  category: string; // ex. "Viandes", "Poissons", "Œufs & laitiers", "Féculents"…
  kcal: number; // pour 100 g (ou 100 ml pour les boissons)
  protein: number; // g pour 100 g
  carbs: number; // g pour 100 g
  fat: number; // g pour 100 g
  fiber?: number; // g pour 100 g
  portion?: { label: string; grams: number }; // unité typique, ex. { label: "1 œuf", grams: 55 }
}

export const GENERIC_FOODS: GenericFood[] = [
  // ───────────── Viandes ─────────────
  { id: "gen-poulet-blanc-cru", name: "Blanc de poulet, cru", category: "Viandes", kcal: 110, protein: 23.5, carbs: 0, fat: 1.8, portion: { label: "1 filet", grams: 150 } },
  { id: "gen-poulet-blanc-cuit", name: "Blanc de poulet, cuit", category: "Viandes", kcal: 148, protein: 31, carbs: 0, fat: 2.6, portion: { label: "1 filet cuit", grams: 110 } },
  { id: "gen-poulet-cuisse-rotie", name: "Cuisse de poulet rôtie, avec peau", category: "Viandes", kcal: 222, protein: 24, carbs: 0, fat: 14, portion: { label: "1 cuisse (sans os)", grams: 110 } },
  { id: "gen-dinde-escalope-cuite", name: "Escalope de dinde, cuite", category: "Viandes", kcal: 135, protein: 29, carbs: 0, fat: 2, portion: { label: "1 escalope", grams: 110 } },
  { id: "gen-boeuf-hache-5-cru", name: "Bœuf haché 5 % MG, cru", category: "Viandes", kcal: 130, protein: 21, carbs: 0, fat: 5, portion: { label: "1 steak haché", grams: 100 } },
  { id: "gen-boeuf-hache-5-cuit", name: "Bœuf haché 5 % MG, cuit", category: "Viandes", kcal: 167, protein: 27, carbs: 0, fat: 6.5, portion: { label: "1 steak haché cuit", grams: 75 } },
  { id: "gen-boeuf-hache-15-cru", name: "Bœuf haché 15 % MG, cru", category: "Viandes", kcal: 210, protein: 18.5, carbs: 0, fat: 15, portion: { label: "1 steak haché", grams: 100 } },
  { id: "gen-boeuf-hache-15-cuit", name: "Bœuf haché 15 % MG, cuit", category: "Viandes", kcal: 245, protein: 25, carbs: 0, fat: 16, portion: { label: "1 steak haché cuit", grams: 75 } },
  { id: "gen-boeuf-rumsteck-grille", name: "Rumsteck (bœuf), grillé", category: "Viandes", kcal: 165, protein: 29, carbs: 0, fat: 5.5, portion: { label: "1 pavé", grams: 150 } },
  { id: "gen-porc-filet-mignon-cuit", name: "Filet mignon de porc, cuit", category: "Viandes", kcal: 153, protein: 28, carbs: 0, fat: 4.5 },
  { id: "gen-porc-cote-grillee", name: "Côte de porc, grillée", category: "Viandes", kcal: 216, protein: 27, carbs: 0, fat: 12, portion: { label: "1 côte (sans os)", grams: 120 } },
  { id: "gen-jambon-blanc", name: "Jambon blanc découenné", category: "Viandes", kcal: 113, protein: 20.5, carbs: 1, fat: 3, portion: { label: "1 tranche", grams: 45 } },
  { id: "gen-jambon-cru", name: "Jambon cru", category: "Viandes", kcal: 240, protein: 26, carbs: 0.5, fat: 15, portion: { label: "1 tranche", grams: 20 } },
  { id: "gen-blanc-de-dinde-tranches", name: "Blanc de dinde (tranches)", category: "Viandes", kcal: 108, protein: 21, carbs: 1.5, fat: 2, portion: { label: "1 tranche", grams: 30 } },
  { id: "gen-poitrine-fumee-bacon", name: "Poitrine fumée / bacon (tranches), crue", category: "Viandes", kcal: 330, protein: 15, carbs: 0.5, fat: 30, portion: { label: "1 tranche", grams: 12 } },
  { id: "gen-lardons-fumes", name: "Lardons fumés, crus", category: "Viandes", kcal: 290, protein: 16, carbs: 0.5, fat: 25 },

  // ───────────── Poissons ─────────────
  { id: "gen-saumon-cru", name: "Saumon, cru", category: "Poissons", kcal: 204, protein: 20.5, carbs: 0, fat: 13.5, portion: { label: "1 pavé", grams: 125 } },
  { id: "gen-saumon-cuit", name: "Saumon, cuit au four", category: "Poissons", kcal: 226, protein: 25, carbs: 0, fat: 14, portion: { label: "1 pavé cuit", grams: 100 } },
  { id: "gen-saumon-fume", name: "Saumon fumé", category: "Poissons", kcal: 193, protein: 23, carbs: 0.5, fat: 11, portion: { label: "1 tranche", grams: 25 } },
  { id: "gen-thon-naturel", name: "Thon au naturel, égoutté", category: "Poissons", kcal: 115, protein: 26, carbs: 0, fat: 1, portion: { label: "1 boîte égouttée", grams: 104 } },
  { id: "gen-thon-huile", name: "Thon à l'huile, égoutté", category: "Poissons", kcal: 186, protein: 25, carbs: 0, fat: 9.5, portion: { label: "1 boîte égouttée", grams: 104 } },
  { id: "gen-cabillaud-cuit", name: "Cabillaud (poisson blanc), cuit", category: "Poissons", kcal: 101, protein: 23, carbs: 0, fat: 0.9, portion: { label: "1 filet", grams: 120 } },
  { id: "gen-crevettes-cuites", name: "Crevettes cuites, décortiquées", category: "Poissons", kcal: 100, protein: 22, carbs: 0, fat: 1.5 },
  { id: "gen-sardines-huile", name: "Sardines à l'huile, égouttées", category: "Poissons", kcal: 213, protein: 24, carbs: 0, fat: 13, portion: { label: "1 boîte égouttée", grams: 87 } },
  { id: "gen-maquereau-grille", name: "Maquereau, grillé", category: "Poissons", kcal: 232, protein: 22, carbs: 0, fat: 16 },
  { id: "gen-surimi", name: "Surimi", category: "Poissons", kcal: 106, protein: 8, carbs: 15, fat: 1.5, portion: { label: "1 bâtonnet", grams: 15 } },

  // ───────────── Œufs & laitiers ─────────────
  { id: "gen-oeuf-entier", name: "Œuf entier", category: "Œufs & laitiers", kcal: 140, protein: 12.5, carbs: 0.7, fat: 9.8, portion: { label: "1 œuf", grams: 55 } },
  { id: "gen-blanc-oeuf", name: "Blanc d'œuf", category: "Œufs & laitiers", kcal: 47, protein: 10.5, carbs: 0.7, fat: 0.2, portion: { label: "1 blanc d'œuf", grams: 33 } },
  { id: "gen-lait-ecreme", name: "Lait écrémé", category: "Œufs & laitiers", kcal: 33, protein: 3.3, carbs: 4.8, fat: 0.1, portion: { label: "1 verre (250 ml)", grams: 250 } },
  { id: "gen-lait-demi-ecreme", name: "Lait demi-écrémé", category: "Œufs & laitiers", kcal: 46, protein: 3.3, carbs: 4.7, fat: 1.6, portion: { label: "1 verre (250 ml)", grams: 250 } },
  { id: "gen-skyr-nature", name: "Skyr nature", category: "Œufs & laitiers", kcal: 59, protein: 10.5, carbs: 3.8, fat: 0.2, portion: { label: "1 pot", grams: 150 } },
  { id: "gen-fromage-blanc-0", name: "Fromage blanc 0 %", category: "Œufs & laitiers", kcal: 47, protein: 7.5, carbs: 4, fat: 0.1, portion: { label: "1 pot individuel", grams: 100 } },
  { id: "gen-fromage-blanc-3", name: "Fromage blanc 3 % MG", category: "Œufs & laitiers", kcal: 71, protein: 7, carbs: 3.8, fat: 3, portion: { label: "1 pot individuel", grams: 100 } },
  { id: "gen-yaourt-nature", name: "Yaourt nature", category: "Œufs & laitiers", kcal: 49, protein: 4.2, carbs: 5.2, fat: 1.2, portion: { label: "1 pot", grams: 125 } },
  { id: "gen-yaourt-grecque", name: "Yaourt à la grecque nature", category: "Œufs & laitiers", kcal: 125, protein: 4, carbs: 4.5, fat: 10, portion: { label: "1 pot", grams: 150 } },
  { id: "gen-yaourt-grec-0", name: "Yaourt grec 0 % (type égoutté)", category: "Œufs & laitiers", kcal: 54, protein: 10.3, carbs: 3, fat: 0, portion: { label: "1 pot", grams: 150 } },
  { id: "gen-cottage-cheese", name: "Cottage cheese", category: "Œufs & laitiers", kcal: 97, protein: 11, carbs: 3.5, fat: 4.3 },
  { id: "gen-emmental", name: "Emmental", category: "Œufs & laitiers", kcal: 380, protein: 28.5, carbs: 0.5, fat: 29.5, portion: { label: "1 portion", grams: 30 } },
  { id: "gen-comte", name: "Comté", category: "Œufs & laitiers", kcal: 405, protein: 27.5, carbs: 0.5, fat: 32.5, portion: { label: "1 portion", grams: 30 } },
  { id: "gen-mozzarella", name: "Mozzarella", category: "Œufs & laitiers", kcal: 240, protein: 18, carbs: 1, fat: 18, portion: { label: "1 boule", grams: 125 } },
  { id: "gen-fromage-chevre", name: "Fromage de chèvre (bûche)", category: "Œufs & laitiers", kcal: 296, protein: 19, carbs: 1, fat: 24, portion: { label: "1 rondelle", grams: 20 } },
  { id: "gen-feta", name: "Feta", category: "Œufs & laitiers", kcal: 262, protein: 16, carbs: 1, fat: 21.5, portion: { label: "1 portion", grams: 30 } },
  { id: "gen-parmesan", name: "Parmesan", category: "Œufs & laitiers", kcal: 390, protein: 33, carbs: 0, fat: 28.5, portion: { label: "1 c. à soupe râpé", grams: 5 } },
  { id: "gen-creme-fraiche-epaisse", name: "Crème fraîche épaisse 30 %", category: "Œufs & laitiers", kcal: 292, protein: 2.3, carbs: 2.8, fat: 30, portion: { label: "1 c. à soupe", grams: 15 } },

  // ───────────── Féculents ─────────────
  { id: "gen-riz-blanc-cru", name: "Riz blanc, cru", category: "Féculents", kcal: 350, protein: 7.2, carbs: 78.5, fat: 0.6, fiber: 1.4, portion: { label: "1 portion crue", grams: 75 } },
  { id: "gen-riz-blanc-cuit", name: "Riz blanc, cuit", category: "Féculents", kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
  { id: "gen-riz-basmati-cru", name: "Riz basmati, cru", category: "Féculents", kcal: 350, protein: 8, carbs: 77, fat: 0.8, fiber: 1.2, portion: { label: "1 portion crue", grams: 75 } },
  { id: "gen-riz-basmati-cuit", name: "Riz basmati, cuit", category: "Féculents", kcal: 129, protein: 3, carbs: 28, fat: 0.4, fiber: 0.5 },
  { id: "gen-riz-complet-cuit", name: "Riz complet, cuit", category: "Féculents", kcal: 122, protein: 2.7, carbs: 24, fat: 1, fiber: 1.6 },
  { id: "gen-pates-crues", name: "Pâtes, crues", category: "Féculents", kcal: 355, protein: 12.5, carbs: 71, fat: 1.5, fiber: 3, portion: { label: "1 portion crue", grams: 80 } },
  { id: "gen-pates-cuites", name: "Pâtes, cuites", category: "Féculents", kcal: 148, protein: 5.2, carbs: 29, fat: 0.9, fiber: 1.8 },
  { id: "gen-pates-completes-cuites", name: "Pâtes complètes, cuites", category: "Féculents", kcal: 125, protein: 5.3, carbs: 22.5, fat: 0.9, fiber: 4 },
  { id: "gen-quinoa-cru", name: "Quinoa, cru", category: "Féculents", kcal: 360, protein: 14, carbs: 58, fat: 6, fiber: 7, portion: { label: "1 portion crue", grams: 70 } },
  { id: "gen-quinoa-cuit", name: "Quinoa, cuit", category: "Féculents", kcal: 120, protein: 4.4, carbs: 19, fat: 1.9, fiber: 2.8 },
  { id: "gen-semoule-crue", name: "Semoule de blé, crue", category: "Féculents", kcal: 355, protein: 12, carbs: 72, fat: 1.2, fiber: 3.5, portion: { label: "1 portion crue", grams: 60 } },
  { id: "gen-semoule-cuite", name: "Semoule de blé, cuite", category: "Féculents", kcal: 112, protein: 3.8, carbs: 23, fat: 0.2, fiber: 1.2 },
  { id: "gen-lentilles-crues", name: "Lentilles vertes, crues", category: "Féculents", kcal: 335, protein: 25, carbs: 48, fat: 1.6, fiber: 16, portion: { label: "1 portion crue", grams: 60 } },
  { id: "gen-lentilles-cuites", name: "Lentilles vertes, cuites", category: "Féculents", kcal: 114, protein: 9, carbs: 14, fat: 0.5, fiber: 7.5 },
  { id: "gen-pois-chiches-cuits", name: "Pois chiches, cuits (égouttés)", category: "Féculents", kcal: 125, protein: 7.5, carbs: 15, fat: 2.4, fiber: 6.5 },
  { id: "gen-haricots-rouges-cuits", name: "Haricots rouges, cuits (égouttés)", category: "Féculents", kcal: 112, protein: 8.5, carbs: 14.5, fat: 0.5, fiber: 7 },
  { id: "gen-flocons-avoine", name: "Flocons d'avoine", category: "Féculents", kcal: 372, protein: 13.5, carbs: 58.7, fat: 7, fiber: 10, portion: { label: "1 portion", grams: 40 } },
  { id: "gen-pain-complet", name: "Pain complet", category: "Féculents", kcal: 240, protein: 9, carbs: 41, fat: 2.5, fiber: 7, portion: { label: "1 tranche", grams: 35 } },
  { id: "gen-pain-blanc", name: "Pain blanc (pain de campagne)", category: "Féculents", kcal: 250, protein: 8.5, carbs: 50, fat: 1.3, fiber: 3.5, portion: { label: "1 tranche", grams: 40 } },
  { id: "gen-baguette", name: "Baguette", category: "Féculents", kcal: 270, protein: 8.5, carbs: 55, fat: 1.3, fiber: 2.8, portion: { label: "1/4 de baguette", grams: 62 } },
  { id: "gen-pain-de-mie", name: "Pain de mie", category: "Féculents", kcal: 270, protein: 8.5, carbs: 48, fat: 4.5, fiber: 3, portion: { label: "1 tranche", grams: 25 } },
  { id: "gen-patate-douce-crue", name: "Patate douce, crue", category: "Féculents", kcal: 84, protein: 1.6, carbs: 17, fat: 0.1, fiber: 3, portion: { label: "1 patate douce moyenne", grams: 200 } },
  { id: "gen-patate-douce-cuite", name: "Patate douce, cuite au four", category: "Féculents", kcal: 90, protein: 2, carbs: 18, fat: 0.2, fiber: 3.3 },
  { id: "gen-pomme-de-terre-crue", name: "Pomme de terre, crue", category: "Féculents", kcal: 78, protein: 2, carbs: 16, fat: 0.1, fiber: 1.8, portion: { label: "1 pomme de terre moyenne", grams: 150 } },
  { id: "gen-pomme-de-terre-cuite", name: "Pomme de terre, cuite à l'eau", category: "Féculents", kcal: 80, protein: 2, carbs: 17, fat: 0.1, fiber: 1.8 },
  { id: "gen-tortilla-ble", name: "Tortilla / wrap de blé", category: "Féculents", kcal: 305, protein: 8.5, carbs: 50, fat: 7.5, fiber: 3, portion: { label: "1 wrap", grams: 60 } },
  { id: "gen-galettes-riz", name: "Galettes de riz soufflé", category: "Féculents", kcal: 385, protein: 8, carbs: 80, fat: 2.8, fiber: 3.5, portion: { label: "1 galette", grams: 8 } },

  // ───────────── Légumes ─────────────
  { id: "gen-brocoli-cuit", name: "Brocoli, cuit", category: "Légumes", kcal: 29, protein: 2.4, carbs: 2.5, fat: 0.4, fiber: 3.3 },
  { id: "gen-courgette", name: "Courgette, crue", category: "Légumes", kcal: 17, protein: 1.2, carbs: 2, fat: 0.3, fiber: 1.1, portion: { label: "1 courgette", grams: 200 } },
  { id: "gen-haricots-verts-cuits", name: "Haricots verts, cuits", category: "Légumes", kcal: 30, protein: 1.9, carbs: 4, fat: 0.2, fiber: 3.2 },
  { id: "gen-epinards-cuits", name: "Épinards, cuits", category: "Légumes", kcal: 25, protein: 3, carbs: 1, fat: 0.5, fiber: 2.5 },
  { id: "gen-tomate", name: "Tomate, crue", category: "Légumes", kcal: 19, protein: 0.9, carbs: 2.9, fat: 0.2, fiber: 1.2, portion: { label: "1 tomate", grams: 120 } },
  { id: "gen-salade-verte", name: "Salade verte (laitue)", category: "Légumes", kcal: 15, protein: 1.2, carbs: 1.5, fat: 0.2, fiber: 1.3 },
  { id: "gen-carotte", name: "Carotte, crue", category: "Légumes", kcal: 39, protein: 0.8, carbs: 7.5, fat: 0.2, fiber: 2.6, portion: { label: "1 carotte", grams: 80 } },
  { id: "gen-poivron", name: "Poivron rouge, cru", category: "Légumes", kcal: 30, protein: 1, carbs: 5, fat: 0.3, fiber: 2, portion: { label: "1 poivron", grams: 150 } },
  { id: "gen-champignons", name: "Champignons de Paris, crus", category: "Légumes", kcal: 20, protein: 3, carbs: 0.5, fat: 0.3, fiber: 1.3 },
  { id: "gen-chou-fleur-cuit", name: "Chou-fleur, cuit", category: "Légumes", kcal: 24, protein: 1.8, carbs: 2.5, fat: 0.3, fiber: 2.3 },
  { id: "gen-concombre", name: "Concombre, cru", category: "Légumes", kcal: 13, protein: 0.6, carbs: 2.2, fat: 0.1, fiber: 0.6 },
  { id: "gen-oignon", name: "Oignon, cru", category: "Légumes", kcal: 36, protein: 1.2, carbs: 6.5, fat: 0.2, fiber: 1.7, portion: { label: "1 oignon", grams: 100 } },
  { id: "gen-mais-doux", name: "Maïs doux (conserve, égoutté)", category: "Légumes", kcal: 92, protein: 2.9, carbs: 16, fat: 1.2, fiber: 3 },

  // ───────────── Fruits ─────────────
  { id: "gen-banane", name: "Banane", category: "Fruits", kcal: 90, protein: 1.1, carbs: 20, fat: 0.3, fiber: 2, portion: { label: "1 banane", grams: 120 } },
  { id: "gen-pomme", name: "Pomme", category: "Fruits", kcal: 53, protein: 0.3, carbs: 11.5, fat: 0.2, fiber: 2, portion: { label: "1 pomme", grams: 150 } },
  { id: "gen-orange", name: "Orange", category: "Fruits", kcal: 44, protein: 0.9, carbs: 8.5, fat: 0.2, fiber: 2, portion: { label: "1 orange", grams: 150 } },
  { id: "gen-fraises", name: "Fraises", category: "Fruits", kcal: 33, protein: 0.7, carbs: 6, fat: 0.3, fiber: 2 },
  { id: "gen-myrtilles", name: "Myrtilles", category: "Fruits", kcal: 51, protein: 0.7, carbs: 10, fat: 0.3, fiber: 2.4 },
  { id: "gen-kiwi", name: "Kiwi", category: "Fruits", kcal: 55, protein: 1, carbs: 10, fat: 0.5, fiber: 2.5, portion: { label: "1 kiwi", grams: 75 } },
  { id: "gen-raisin", name: "Raisin", category: "Fruits", kcal: 70, protein: 0.6, carbs: 16, fat: 0.2, fiber: 1 },
  { id: "gen-mangue", name: "Mangue", category: "Fruits", kcal: 62, protein: 0.7, carbs: 13.5, fat: 0.3, fiber: 1.8 },
  { id: "gen-dattes", name: "Dattes sèches", category: "Fruits", kcal: 285, protein: 2.5, carbs: 64, fat: 0.4, fiber: 7, portion: { label: "1 datte", grams: 8 } },
  { id: "gen-avocat", name: "Avocat", category: "Fruits", kcal: 205, protein: 1.9, carbs: 2, fat: 20, fiber: 6.7, portion: { label: "1/2 avocat", grams: 75 } },
  { id: "gen-compote-ssa", name: "Compote sans sucres ajoutés", category: "Fruits", kcal: 53, protein: 0.3, carbs: 12, fat: 0.1, fiber: 1.5, portion: { label: "1 gourde", grams: 90 } },

  // ───────────── Oléagineux & graines ─────────────
  { id: "gen-amandes", name: "Amandes", category: "Oléagineux & graines", kcal: 625, protein: 25, carbs: 7.5, fat: 53, fiber: 11, portion: { label: "1 poignée", grams: 30 } },
  { id: "gen-noix", name: "Noix (cerneaux)", category: "Oléagineux & graines", kcal: 690, protein: 15, carbs: 7, fat: 65, fiber: 6.7, portion: { label: "1 poignée", grams: 30 } },
  { id: "gen-noisettes", name: "Noisettes", category: "Oléagineux & graines", kcal: 650, protein: 15, carbs: 7, fat: 61, fiber: 9.7, portion: { label: "1 poignée", grams: 30 } },
  { id: "gen-noix-cajou", name: "Noix de cajou", category: "Oléagineux & graines", kcal: 595, protein: 18, carbs: 26, fat: 46, fiber: 3.3, portion: { label: "1 poignée", grams: 30 } },
  { id: "gen-cacahuetes", name: "Cacahuètes grillées", category: "Oléagineux & graines", kcal: 610, protein: 25, carbs: 12, fat: 50, fiber: 8, portion: { label: "1 poignée", grams: 30 } },
  { id: "gen-beurre-cacahuete", name: "Beurre de cacahuète", category: "Oléagineux & graines", kcal: 625, protein: 25, carbs: 13, fat: 51, fiber: 6, portion: { label: "1 c. à soupe", grams: 15 } },
  { id: "gen-graines-chia", name: "Graines de chia", category: "Oléagineux & graines", kcal: 450, protein: 17, carbs: 8, fat: 31, fiber: 34, portion: { label: "1 c. à soupe", grams: 12 } },
  { id: "gen-graines-lin", name: "Graines de lin", category: "Oléagineux & graines", kcal: 510, protein: 18, carbs: 1.6, fat: 42, fiber: 27, portion: { label: "1 c. à soupe", grams: 10 } },
  { id: "gen-noix-macadamia", name: "Noix de macadamia", category: "Oléagineux & graines", kcal: 745, protein: 8, carbs: 5, fat: 76, fiber: 8.6, portion: { label: "1 poignée", grams: 30 } },
  { id: "gen-noix-pecan", name: "Noix de pécan", category: "Oléagineux & graines", kcal: 715, protein: 9, carbs: 4.3, fat: 72, fiber: 9.6, portion: { label: "1 poignée", grams: 30 } },
  { id: "gen-noix-coco-fraiche", name: "Noix de coco, chair fraîche", category: "Oléagineux & graines", kcal: 354, protein: 3.3, carbs: 6, fat: 33, fiber: 9 },
  { id: "gen-noix-coco-rapee", name: "Noix de coco râpée", category: "Oléagineux & graines", kcal: 650, protein: 6.5, carbs: 7, fat: 62, fiber: 16, portion: { label: "1 c. à soupe", grams: 6 } },

  // ───────────── Matières grasses ─────────────
  { id: "gen-beurre", name: "Beurre doux", category: "Matières grasses", kcal: 745, protein: 0.7, carbs: 0.6, fat: 82, portion: { label: "1 noisette", grams: 10 } },
  { id: "gen-huile-olive", name: "Huile d'olive", category: "Matières grasses", kcal: 900, protein: 0, carbs: 0, fat: 100, portion: { label: "1 c. à soupe", grams: 10 } },
  { id: "gen-huile-colza", name: "Huile de colza", category: "Matières grasses", kcal: 900, protein: 0, carbs: 0, fat: 100, portion: { label: "1 c. à soupe", grams: 10 } },
  { id: "gen-huile-coco", name: "Huile de coco", category: "Matières grasses", kcal: 900, protein: 0, carbs: 0, fat: 100, portion: { label: "1 c. à soupe", grams: 10 } },
  { id: "gen-mayonnaise", name: "Mayonnaise", category: "Matières grasses", kcal: 715, protein: 1.3, carbs: 1.5, fat: 78, portion: { label: "1 c. à soupe", grams: 15 } },

  // ───────────── Boissons (valeurs pour 100 ml) ─────────────
  { id: "gen-jus-orange", name: "Jus d'orange (100 % pur jus)", category: "Boissons", kcal: 42, protein: 0.7, carbs: 9.5, fat: 0.1, fiber: 0.2, portion: { label: "1 verre (200 ml)", grams: 200 } },
  { id: "gen-soda-cola", name: "Soda (type cola)", category: "Boissons", kcal: 42, protein: 0, carbs: 10.6, fat: 0, portion: { label: "1 canette (33 cl)", grams: 330 } },
  { id: "gen-soda-zero", name: "Soda zéro / light", category: "Boissons", kcal: 0, protein: 0, carbs: 0, fat: 0, portion: { label: "1 canette (33 cl)", grams: 330 } },
  { id: "gen-biere-blonde", name: "Bière blonde (5 % vol.)", category: "Boissons", kcal: 42, protein: 0.4, carbs: 3.1, fat: 0, portion: { label: "1 demi (25 cl)", grams: 250 } },
  { id: "gen-vin-rouge", name: "Vin rouge (12,5 % vol.)", category: "Boissons", kcal: 70, protein: 0.1, carbs: 0.3, fat: 0, portion: { label: "1 verre (12,5 cl)", grams: 125 } },
  { id: "gen-cafe-noir", name: "Café noir, sans sucre", category: "Boissons", kcal: 2, protein: 0.2, carbs: 0.3, fat: 0, portion: { label: "1 tasse (100 ml)", grams: 100 } },
  { id: "gen-lait-amande", name: "Boisson à l'amande, sans sucre", category: "Boissons", kcal: 13, protein: 0.5, carbs: 0.3, fat: 1.1, portion: { label: "1 verre (250 ml)", grams: 250 } },

  // ───────────── Divers ─────────────
  { id: "gen-whey", name: "Whey protéine (poudre)", category: "Divers", kcal: 390, protein: 78, carbs: 7, fat: 6, portion: { label: "1 scoop", grams: 30 } },
  { id: "gen-caseine", name: "Caséine micellaire (poudre)", category: "Divers", kcal: 355, protein: 80, carbs: 5, fat: 1.5, portion: { label: "1 scoop", grams: 30 } },
  { id: "gen-miel", name: "Miel", category: "Divers", kcal: 325, protein: 0.4, carbs: 81, fat: 0, portion: { label: "1 c. à café", grams: 8 } },
  { id: "gen-chocolat-noir-70", name: "Chocolat noir 70 %", category: "Divers", kcal: 570, protein: 8, carbs: 33, fat: 42, fiber: 11, portion: { label: "1 carré", grams: 5 } },
  { id: "gen-confiture", name: "Confiture", category: "Divers", kcal: 245, protein: 0.4, carbs: 60, fat: 0.1, fiber: 1, portion: { label: "1 c. à soupe", grams: 20 } },
  { id: "gen-sucre", name: "Sucre blanc", category: "Divers", kcal: 400, protein: 0, carbs: 100, fat: 0, portion: { label: "1 morceau", grams: 5 } },
  { id: "gen-tofu-nature", name: "Tofu nature (ferme)", category: "Divers", kcal: 128, protein: 13, carbs: 1.5, fat: 7.5, fiber: 1 },
  { id: "gen-tempeh", name: "Tempeh", category: "Divers", kcal: 195, protein: 19, carbs: 6.5, fat: 10.5, fiber: 4 },
  { id: "gen-seitan", name: "Seitan", category: "Divers", kcal: 150, protein: 25, carbs: 9, fat: 2, fiber: 1 },
  { id: "gen-houmous", name: "Houmous", category: "Divers", kcal: 285, protein: 7, carbs: 12, fat: 22, fiber: 5, portion: { label: "1 c. à soupe", grams: 20 } },
  { id: "gen-olives-vertes", name: "Olives vertes (saumure)", category: "Divers", kcal: 135, protein: 1.1, carbs: 0.5, fat: 14, fiber: 3, portion: { label: "10 olives", grams: 35 } },
];
