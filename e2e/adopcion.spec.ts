import { expect, test, type Page } from "@playwright/test";

import { SEED, confirmDialog, getEmailLink, makeTestPhoto, newLoggedInPage } from "./helpers";

// Flujo completo: registro → publicar → postular → chat → aprobar → adopción → seguimiento → reporte → moderación.
test.describe.serial("Flujo completo de adopción", () => {
  const run = Date.now().toString(36);
  const adopterEmail = `adoptante-${run}@huellitas.test`;
  const adopterPassword = "Perritos2026";
  const petName = `Nala ${run}`;
  const reportPetName = `Toby ${run}`;
  const catName = `Michi ${run}`;

  let adopter: Page;
  let shelter: Page;
  let petUrl = "";
  let reportPetUrl = "";
  let applicationUrl = "";
  let chatUrl = "";

  test.afterAll(async () => {
    await adopter?.context().close();
    await shelter?.context().close();
  });

  test("registro con confirmación por correo y bienvenida", async ({ browser }) => {
    const context = await browser.newContext();
    adopter = await context.newPage();

    await adopter.goto("/registro");
    await adopter.getByLabel("Tu nombre o el de tu organización").fill("Valentina Prueba");
    await adopter.getByLabel("Correo electrónico").fill(adopterEmail);
    await adopter.getByLabel("Contraseña", { exact: true }).fill(adopterPassword);
    await adopter.getByLabel("Repite la contraseña").fill(adopterPassword);
    await adopter.getByLabel(/Acepto los/).check();
    await adopter.getByLabel("Declaro ser mayor de 18 años").check();
    await adopter.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(adopter.getByText("¡Revisa tu correo!")).toBeVisible();

    const link = await getEmailLink(adopterEmail);
    expect(link).toContain("token_hash=");
    await adopter.goto(link);
    await expect(adopter).toHaveURL(/\/bienvenida/);

    await adopter.getByLabel("Región").selectOption("13");
    await adopter.getByLabel("Comuna").selectOption("13120");
    await adopter.getByLabel("Teléfono (opcional y privado)").fill("+56 9 5555 4444");
    await adopter.getByLabel(/Acepto los/).check();
    await adopter.getByLabel("Declaro ser mayor de 18 años").check();
    await adopter.getByRole("button", { name: "Continuar" }).click();
    await expect(adopter).toHaveURL("/");
    await expect(adopter.getByRole("button", { name: "Menú de mi cuenta" })).toBeVisible();
  });

  test("una fundación publica mascotas (con y sin foto)", async ({ browser }) => {
    shelter = await newLoggedInPage(browser, SEED.shelter);
    const photo = await makeTestPhoto(browser);

    await shelter.goto("/publicar");
    await shelter.getByLabel("Nombre").fill(petName);
    await shelter.getByText("Hembra", { exact: true }).click();
    await shelter.getByLabel("Tamaño").selectOption("medium");
    await shelter.getByLabel("Años").fill("2");
    await shelter.getByLabel("Descripción").fill(
      "Nala fue rescatada de la calle en invierno. Es cariñosa, tranquila y se lleva muy bien con niños y otros perros.",
    );
    await shelter.getByLabel("Vacunas al día").check();
    await shelter.getByLabel("Esterilizado").check();
    await shelter.getByLabel("Región").selectOption("13");
    await shelter.getByLabel("Comuna").selectOption("13120");
    await shelter.locator('input[type="file"]').setInputFiles(photo);
    await expect(shelter.getByText("Portada")).toBeVisible();
    await shelter.getByRole("button", { name: "Publicar", exact: true }).click();

    await expect(shelter).toHaveURL(/\/mascotas\/[0-9a-f-]{36}\?publicado=1/, { timeout: 30_000 });
    petUrl = shelter.url().split("?")[0];
    await expect(shelter.getByRole("heading", { level: 1, name: petName })).toBeVisible();
    await expect(shelter.locator('img[src*="pet-photos"]').first()).toBeVisible();

    // Segunda publicación, sin fotos (se usará para probar reportes y moderación).
    await shelter.goto("/publicar");
    await shelter.getByLabel("Nombre").fill(reportPetName);
    await shelter.getByLabel("Tamaño").selectOption("small");
    await shelter.getByLabel("Descripción").fill("Toby es un perro juguetón y sociable que busca una familia activa.");
    await shelter.getByLabel("Región").selectOption("13");
    await shelter.getByLabel("Comuna").selectOption("13101");
    await shelter.getByLabel("Publicar sin fotos por ahora").check();
    await shelter.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(shelter).toHaveURL(/\/mascotas\/[0-9a-f-]{36}\?publicado=1/, { timeout: 30_000 });
    reportPetUrl = shelter.url().split("?")[0];
  });

  test("la búsqueda encuentra la publicación (sin tildes)", async () => {
    await adopter.goto(`/mascotas?tipo=adopcion&q=${encodeURIComponent(`nala ${run}`)}&region=13`);
    await expect(adopter.getByRole("link", { name: new RegExp(petName) })).toBeVisible();
  });

  test("crear una alerta de gatos desde la búsqueda", async () => {
    await adopter.goto("/mascotas?tipo=adopcion&especie=gatos&region=13&comuna=13120");
    await expect(adopter.getByText("Gatos en adopción · Ñuñoa, Metropolitana")).toBeVisible();
    await adopter.getByRole("button", { name: "Crear alerta" }).click();
    await expect(adopter.getByText(/Alerta creada/)).toBeVisible();
  });

  test("publicar un gato y filtrar por especie", async ({ browser }) => {
    await shelter.goto("/publicar?especie=gatos");
    const speciesGroup = shelter.getByRole("group", { name: /Especie/ });
    await expect(speciesGroup.getByRole("radio", { name: /Gato/ })).toBeChecked();
    await expect(shelter.getByLabel("Raza")).toHaveValue(/[Mm]estiz/);
    await shelter.getByLabel("Nombre").fill(catName);
    await shelter.getByText("Macho", { exact: true }).click();
    await shelter.getByLabel("Tamaño").selectOption("small");
    await shelter.getByLabel("Descripción").fill(
      "Michi llegó a una fundación tras ser rescatado de un techo. Es curioso, limpio y muy regalón.",
    );
    await shelter.getByLabel("Región").selectOption("13");
    await shelter.getByLabel("Comuna").selectOption("13120");
    await shelter.locator('input[type="file"]').setInputFiles(await makeTestPhoto(browser, "gatito.jpg"));
    await expect(shelter.getByText("Portada")).toBeVisible();
    await shelter.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(shelter).toHaveURL(/\/mascotas\/[0-9a-f-]{36}\?publicado=1/, { timeout: 30_000 });
    await expect(shelter.getByRole("heading", { level: 1, name: catName })).toBeVisible();
    await expect(shelter.getByText("Gato", { exact: true }).first()).toBeVisible();

    // La alerta avisa a la persona adoptante.
    await adopter.goto("/notificaciones");
    await expect(adopter.getByText("Nueva mascota en adopción para tu alerta").first()).toBeVisible();
    await expect(adopter.getByText(new RegExp(`${catName} · Gato · Ñuñoa`))).toBeVisible();

    // Filtro por especie: aparece en gatos y no en perros.
    const q = encodeURIComponent(`michi ${run}`);
    await adopter.goto(`/mascotas?especie=gatos&q=${q}`);
    await expect(adopter.getByRole("heading", { level: 1, name: "Gatos en adopción" })).toBeVisible();
    await expect(adopter.getByRole("link", { name: new RegExp(catName) })).toBeVisible();
    await adopter.goto(`/mascotas?especie=perros&q=${q}`);
    await expect(adopter.getByRole("heading", { level: 1, name: "Perros en adopción" })).toBeVisible();
    await expect(adopter.getByRole("link", { name: new RegExp(catName) })).toHaveCount(0);

    // Los chips de especie conservan la búsqueda.
    await adopter
      .getByRole("navigation", { name: "Filtrar por especie" })
      .getByRole("link", { name: "Gatos" })
      .click();
    await expect(adopter).toHaveURL(/especie=gatos/);
    await expect(adopter.getByRole("link", { name: new RegExp(catName) })).toBeVisible();
  });

  test("gestionar mis alertas", async () => {
    await adopter.goto("/alertas");
    const item = adopter.getByRole("listitem").filter({ hasText: "Gatos en adopción · Ñuñoa, Metropolitana" });
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: /Eliminar alerta/ }).click();
    await expect(adopter.getByText("Aún no tienes alertas")).toBeVisible();

    // Alerta para quien perdió a su mascota, desde el formulario.
    await adopter.getByLabel("¿Qué quieres que te avisemos?").selectOption("encontrados");
    await adopter.getByLabel("Especie").selectOption("perros");
    await adopter.getByRole("button", { name: "Crear alerta" }).click();
    await expect(adopter.getByText(/Alerta creada/)).toBeVisible();
    await expect(adopter.getByText("Perros encontrados · Región Metropolitana de Santiago")).toBeVisible();
  });

  test("las URL antiguas de /perritos redirigen a /mascotas", async ({ page }) => {
    await page.goto("/perritos?tipo=adopcion");
    await expect(page).toHaveURL(/\/mascotas\?tipo=adopcion/);
  });

  test("postular con el cuestionario de adopción", async () => {
    await adopter.goto(petUrl);
    await adopter.getByRole("link", { name: "Quiero adoptar" }).click();
    await expect(adopter).toHaveURL(/\/postular$/);

    await adopter.getByText("Departamento", { exact: true }).click();
    await adopter.getByRole("group", { name: /La vivienda es/ }).getByText("Arrendada").click();
    await adopter.getByRole("group", { name: /arriendo/ }).getByText("Sí").click();
    await adopter.getByRole("group", { name: /patio/ }).getByText("No").click();
    await adopter.getByLabel("Adultos en el hogar").fill("2");
    await adopter.getByLabel(/Todas las personas con las que vivo/).check();
    await adopter.getByLabel(/Cuántas horas al día/).fill("4");
    await adopter.getByLabel("¿Qué experiencia tienes cuidando animales?").fill("Crecí con perros rescatados en la casa de mis padres.");
    await adopter
      .getByLabel(/Por qué quieres adoptar/)
      .fill("Trabajo de forma híbrida, tengo tiempo para paseos diarios y quiero darle un hogar definitivo y mucho amor.");
    await adopter.getByLabel(/vacaciones, mudanzas/).fill("Mi hermana vive cerca y la cuidaría si viajo.");
    await adopter.getByLabel(/atención veterinaria/).check();
    await adopter.getByLabel(/esterilizarla/).check();
    await adopter.getByLabel(/seguimientos/).check();
    await adopter.getByLabel(/Nunca la abandonaré/).check();
    await adopter.getByRole("button", { name: "Enviar solicitud" }).click();

    await expect(adopter).toHaveURL(/\/solicitudes\/[0-9a-f-]{36}\?enviada=1/);
    await expect(adopter.getByText("¡Solicitud enviada!")).toBeVisible();
    applicationUrl = adopter.url().split("?")[0];
  });

  test("chat en tiempo real con advertencia de estafa", async () => {
    await adopter.goto(applicationUrl);
    await adopter.getByRole("link", { name: "Ir al chat" }).first().click();
    await expect(adopter).toHaveURL(/\/mensajes\/[0-9a-f-]{36}/);
    chatUrl = adopter.url();
    await expect(adopter.getByText(/envió una solicitud de adopción/)).toBeVisible();

    await shelter.goto(chatUrl);
    await expect(shelter.getByText(/envió una solicitud de adopción/)).toBeVisible();
    await shelter.waitForTimeout(1500); // da tiempo a que se establezca la suscripción en tiempo real

    const input = adopter.getByLabel("Escribe un mensaje");
    await input.fill("¡Hola! ¿Cuándo podríamos conocer a Nala?");
    await input.press("Enter");
    await expect(shelter.getByText("¡Hola! ¿Cuándo podríamos conocer a Nala?")).toBeVisible({ timeout: 15_000 });

    await shelter.getByLabel("Escribe un mensaje").fill("Si quieres te la reservo con una transferencia de $10.000");
    await expect(shelter.getByText(/Parece que hablas de dinero/)).toBeVisible();
    await shelter.getByLabel("Escribe un mensaje").press("Enter");
    await expect(adopter.getByText(/Este mensaje menciona dinero/)).toBeVisible({ timeout: 15_000 });
  });

  test("aprobar, firmar acta y confirmar la adopción", async () => {
    await shelter.goto(applicationUrl);
    await shelter.getByRole("button", { name: "Aprobar solicitud" }).click();
    await confirmDialog(shelter, "Aprobar");
    await expect(shelter.getByText("Aprobada", { exact: true }).first()).toBeVisible();

    await shelter.getByRole("link", { name: "Acta de adopción" }).click();
    await expect(shelter.getByRole("heading", { name: "Acta de Adopción Responsable" })).toBeVisible();
    await expect(shelter.getByText(petName).first()).toBeVisible();

    await shelter.goto(applicationUrl);
    await shelter.getByRole("button", { name: "Confirmar adopción" }).click();
    await shelter.getByRole("dialog").getByLabel(/Confirmo que la entrega se realizó/).check();
    await confirmDialog(shelter, "Confirmar entrega");
    await expect(shelter.getByText("Adopción concretada", { exact: true }).first()).toBeVisible();

    await adopter.goto(petUrl);
    await expect(adopter.getByText(/ya encontró un hogar/)).toBeVisible();
  });

  test("la persona adoptante envía el primer seguimiento", async ({ browser }) => {
    await adopter.goto("/seguimientos");
    await adopter.getByRole("link", { name: /1 semana/ }).click();
    await adopter.getByText("¡Feliz!", { exact: true }).click();
    await adopter.getByLabel("Cuéntanos cómo ha sido").fill("Se adaptó súper bien, duerme en su camita y ya conoce la plaza.");
    await adopter.locator('input[type="file"]').setInputFiles(await makeTestPhoto(browser, "seguimiento.jpg"));
    await adopter.getByRole("button", { name: "Enviar seguimiento" }).click();
    await expect(adopter.getByRole("heading", { name: /Enviado el/ })).toBeVisible();
    await expect(adopter.locator('img[src*="followup-photos"]')).toBeVisible();

    await shelter.goto("/seguimientos");
    await shelter.getByRole("link", { name: new RegExp(`${petName} · 1 semana`) }).click();
    await expect(shelter.getByText("Se adaptó súper bien")).toBeVisible();
    await expect(shelter.locator('img[src*="followup-photos"]')).toBeVisible();
  });

  test("reporte confidencial y moderación", async ({ browser }) => {
    await adopter.goto(reportPetUrl);
    await adopter.getByRole("button", { name: "Reportar publicación" }).click();
    await adopter.getByRole("dialog").getByLabel("Motivo").selectOption("scam");
    await adopter.getByRole("dialog").getByLabel("Cuéntanos qué pasó").fill("Me pidió dinero para reservarlo.");
    await adopter.getByRole("dialog").getByRole("button", { name: "Enviar reporte" }).click();
    await expect(adopter.getByText(/Gracias por avisarnos/)).toBeVisible();

    const admin = await newLoggedInPage(browser, SEED.admin);
    await admin.goto("/admin/reportes");
    const card = admin.getByRole("article").filter({ has: admin.getByRole("link", { name: reportPetName }) });
    await expect(card.getByText("Urgente")).toBeVisible();
    await card.getByRole("button", { name: "Ocultar publicación" }).click();
    await admin.getByRole("dialog").getByLabel(/Motivo/).fill("Posible estafa: en revisión.");
    await confirmDialog(admin, "Ocultar");

    const anonymous = await browser.newPage();
    await anonymous.goto(reportPetUrl);
    await expect(anonymous.getByText("No encontramos esta página")).toBeVisible();

    await admin.goto("/admin/auditoria");
    await expect(admin.getByText("Ocultó una publicación").first()).toBeVisible();
    await anonymous.close();
    await admin.context().close();
  });
});

test.describe("Protección de rutas", () => {
  test("visitantes son redirigidos a ingresar", async ({ page }) => {
    await page.goto("/mensajes");
    await expect(page).toHaveURL(/\/ingresar\?next=%2Fmensajes/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("una cuenta normal no ve el panel de moderación", async ({ browser }) => {
    const page = await newLoggedInPage(browser, SEED.shelter);
    await page.goto("/admin");
    await expect(page.getByText("No encontramos esta página")).toBeVisible();
    await page.context().close();
  });

  test("la portada carga sin violaciones de CSP", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    const response = await page.goto("/");
    expect(response?.headers()["content-security-policy"]).toContain("nonce-");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors.filter((e) => /Content Security Policy/i.test(e))).toEqual([]);
  });
});
