export const emptyCelana = {
  panjang: "",
  bawah: "",
  lutut: "",
  paha: "",
  kilMistak: "",
  pinggang: "",
  pinggul: "",
};

export const emptyBaju = {
  panjang: "",
  lingkarDada: "",
  pinggang: "",
  pinggul: "",
  bahu: "",
  panjangLengan: "",
  lingkarLengan: "",
  pergelangan: "",
  leher: "",
};

export function defaultBodyMeasurements(): NormalizedBodyMeasurements {
  return {
    celana: { ...emptyCelana },
    baju: { ...emptyBaju },
    tinggiBadan: "",
  };
}

/** Normalisasi JSON ukuran: format baru (celana/baju) + migrasi field lama */
export type NormalizedBodyMeasurements = {
  celana: typeof emptyCelana;
  baju: typeof emptyBaju;
  tinggiBadan: string;
};

export function normalizeBodyMeasurements(raw: unknown): NormalizedBodyMeasurements {
  const m = (raw ?? {}) as Record<string, unknown>;
  const celanaIn = (m.celana ?? {}) as Record<string, unknown>;
  const bajuIn = (m.baju ?? {}) as Record<string, unknown>;

  const legacyPinggang = String(m.pinggang ?? celanaIn.pinggang ?? bajuIn.pinggang ?? "");
  const legacyPinggul = String(m.pinggul ?? celanaIn.pinggul ?? bajuIn.pinggul ?? "");

  return {
    celana: {
      ...emptyCelana,
      panjang: String(celanaIn.panjang ?? m.panjangCelana ?? ""),
      bawah: String(celanaIn.bawah ?? ""),
      lutut: String(celanaIn.lutut ?? ""),
      paha: String(celanaIn.paha ?? ""),
      kilMistak: String(celanaIn.kilMistak ?? ""),
      pinggang: String(celanaIn.pinggang ?? legacyPinggang),
      pinggul: String(celanaIn.pinggul ?? legacyPinggul),
    },
    baju: {
      ...emptyBaju,
      panjang: String(bajuIn.panjang ?? m.panjangBaju ?? ""),
      lingkarDada: String(bajuIn.lingkarDada ?? m.dada ?? ""),
      pinggang: String(bajuIn.pinggang ?? legacyPinggang),
      pinggul: String(bajuIn.pinggul ?? legacyPinggul),
      bahu: String(bajuIn.bahu ?? ""),
      panjangLengan: String(bajuIn.panjangLengan ?? ""),
      lingkarLengan: String(bajuIn.lingkarLengan ?? m.lengan ?? ""),
      pergelangan: String(bajuIn.pergelangan ?? ""),
      leher: String(bajuIn.leher ?? m.leher ?? ""),
    },
    tinggiBadan: String(m.tinggiBadan ?? ""),
  };
}

export function measurementsForAi(
  body: NormalizedBodyMeasurements | undefined,
): Record<string, string> {
  const b = body ?? defaultBodyMeasurements();
  return {
    dada: b.baju.lingkarDada,
    pinggang: b.baju.pinggang,
    tinggiBadan: b.tinggiBadan ?? "",
    lingkarDada: b.baju.lingkarDada,
    panjangBaju: b.baju.panjang,
    panjangCelana: b.celana.panjang,
  };
}
