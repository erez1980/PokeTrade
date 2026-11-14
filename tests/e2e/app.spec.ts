import { expect, test, type Page } from "@playwright/test";

async function pick(page: Page, panel: string, query: string, optionName: RegExp) {
  const region = page.getByRole("region", { name: panel });
  await region.getByRole("combobox").fill(query);
  await region.getByRole("option", { name: optionName }).first().click();
}

test.describe("compare", () => {
  test("child flow: Hebrew search, characteristics, result with scores, meter and Hebrew explanation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "מי יותר נדיר?" })).toBeVisible();
    await pick(page, "הפוקימון שלי", "מיוטו", /מיוטו/);
    await pick(page, "הפוקימון השני", "פיקאצו", /פיקאצ'ו/);
    await page.getByRole("region", { name: "הפוקימון השני" }).getByRole("button", { name: /^שייני/ }).click();
    await page.getByRole("button", { name: "השוואה!" }).click();
    const result = page.locator('section[aria-labelledby="result-title"]');
    await expect(result).toBeVisible();
    await expect(result.getByText(/\/100/).first()).toBeVisible();
    await expect(page.getByRole("meter")).toBeVisible();
    await expect(result.getByText("נחשב נדיר יותר כי").first()).toBeVisible();
    await expect(result.getByText(/אפשר להחליף|לא ניתן להחלפה/).first()).toBeVisible();
  });

  test("swap keeps attributes with the right Pokémon", async ({ page }) => {
    await page.goto("/");
    await pick(page, "הפוקימון שלי", "150", /מיוטו/);
    await pick(page, "הפוקימון השני", "Pikachu", /פיקאצ'ו/);
    await page.getByRole("region", { name: "הפוקימון השני" }).getByRole("button", { name: /^שייני/ }).click();
    await page.getByRole("button", { name: "החלפת צדדים" }).click();
    const mine = page.getByRole("region", { name: "הפוקימון שלי" });
    await expect(mine.getByText("פיקאצ'ו").first()).toBeVisible();
    await expect(mine.getByRole("button", { name: /^שייני/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("impossible combinations are disabled with an explanation", async ({ page }) => {
    await page.goto("/");
    await pick(page, "הפוקימון שלי", "פיקאצו", /פיקאצ'ו/);
    const panel = page.getByRole("region", { name: "הפוקימון שלי" });
    const gmax = panel.getByRole("button", { name: /^גיגנטמקס/ });
    await expect(gmax).toHaveAttribute("aria-disabled", "true");
    await gmax.click({ force: true }); // a child can still tap it; it must explain instead of toggling
    await expect(panel.getByText("לפוקימון הזה אין צורת גיגנטמקס.")).toBeVisible();
    await expect(gmax).toHaveAttribute("aria-pressed", "false");
  });

  test("unverified combinations show 'insufficient data' instead of a score", async ({ page }) => {
    await page.goto("/?a=" + encodeURIComponent("25|PIKACHU_C_HOLIDAY_2016|S||||||") + "&b=" + encodeURIComponent("16|PIDGEY_NORMAL|||||||"));
    await page.getByRole("button", { name: "השוואה!" }).click();
    await expect(page.getByText("אי אפשר לקבוע בוודאות מי יותר נדיר.")).toBeVisible();
    await expect(page.getByText("אין ציון").first()).toBeVisible();
    await expect(page.getByRole("meter")).toHaveCount(0);
  });

  test("keyboard: search combobox with arrows + Enter", async ({ page }) => {
    await page.goto("/");
    const input = page.getByRole("region", { name: "הפוקימון שלי" }).getByRole("combobox");
    await input.focus();
    await page.keyboard.type("char");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "הפוקימון שלי" }).getByRole("button", { name: "החלפה" })).toBeVisible();
  });
});

test.describe("voice search", () => {
  test("unsupported browser keeps a disabled mic and text search works", async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-expect-error test shim
      delete window.webkitSpeechRecognition;
      // @ts-expect-error test shim
      delete window.SpeechRecognition;
    });
    await page.goto("/");
    const mic = page.getByRole("region", { name: "הפוקימון שלי" }).getByRole("button", { name: /חיפוש קולי/ });
    await expect(mic).toBeDisabled();
    await pick(page, "הפוקימון שלי", "רייקוואזה", /רייקוואזה/);
  });

  test("Hebrew recognition result shows candidates the user must confirm", async ({ page }) => {
    await page.addInitScript(() => {
      class FakeRec {
        lang = "";
        continuous = false;
        interimResults = false;
        maxAlternatives = 1;
        onresult: ((e: unknown) => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          (window as unknown as { __voiceLang: string }).__voiceLang = this.lang;
          setTimeout(() => {
            const r = Object.assign([{ transcript: "רייקוואזה", confidence: 0.7 }], { isFinal: true });
            this.onresult?.({ results: [r] });
            this.onend?.();
          }, 50);
        }
        stop() {}
        abort() {}
      }
      const w = window as unknown as { webkitSpeechRecognition: unknown; SpeechRecognition: unknown };
      w.webkitSpeechRecognition = FakeRec;
      w.SpeechRecognition = FakeRec;
    });
    await page.goto("/");
    const panel = page.getByRole("region", { name: "הפוקימון שלי" });
    await panel.getByRole("button", { name: "חיפוש קולי" }).click();
    await expect(panel.getByText("שמענו:")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __voiceLang: string }).__voiceLang)).toBe("he-IL");
    // Not auto-selected: the user confirms
    await expect(panel.getByRole("button", { name: "החלפה" })).toHaveCount(0);
    await panel.getByRole("button", { name: /רייקוואזה/ }).click();
    await expect(panel.getByText("Rayquaza")).toBeVisible();
  });
});

test.describe("rankings, pokédex, details", () => {
  test("rankings list with filters and unranked section", async ({ page }) => {
    await page.goto("/rankings/");
    await expect(page.getByRole("heading", { name: "הפוקימונים הכי נדירים ב־Pokémon GO" })).toBeVisible();
    await expect(page.getByText("הדירוג מבוסס על זמינות").first()).toBeVisible();
    await expect(page.locator("ol > li")).toHaveCount(25);
    await page.getByRole("button", { name: "גיגנטמקס" }).click();
    await expect(page.locator("ol > li").first()).toContainText("גיגנטמקס");
    await page.getByRole("button", { name: "רקעים מיוחדים" }).click();
    await expect(page.getByText("עדיין לא אימתנו רקעים מיוחדים")).toBeVisible();
    await page.getByRole("tab", { name: "לפי סוג פוקימון" }).click();
    await expect(page.getByRole("heading", { name: /לא מדורג/ })).toHaveCount(0);
  });

  test("pokédex search and details page", async ({ page }) => {
    await page.goto("/pokedex/");
    await page.getByRole("searchbox").fill("גנגר");
    await page.getByRole("link", { name: /גנגר/ }).first().click();
    await expect(page.getByRole("heading", { name: "גנגר" })).toBeVisible();
    await expect(page.getByText("זמינות לפי המקורות")).toBeVisible();
    await expect(page.getByRole("button", { name: "הוספה לאוסף" })).toBeVisible();
  });
});

test.describe("collection & wishlist", () => {
  test("add to collection, persists after reload, compare from collection", async ({ page }) => {
    await page.goto("/collection/entry/");
    await page.getByRole("combobox").fill("snorlax");
    await page.getByRole("option", { name: /סנורלקס/ }).first().click();
    await page.getByRole("button", { name: /^שייני/ }).click();
    await page.getByLabel("כינוי").fill("ישנוני");
    await page.getByRole("button", { name: "שמירה" }).click();
    await expect(page).toHaveURL(/\/collection\/$/);
    await expect(page.getByText("ישנוני")).toBeVisible();
    await page.reload();
    await expect(page.getByText("ישנוני")).toBeVisible();
    await page.getByRole("link", { name: "השוואה" }).first().click();
    await expect(page.getByRole("region", { name: "הפוקימון שלי" }).getByText("סנורלקס").first()).toBeVisible();
    // pick the second Pokémon from the saved collection
    await page.getByRole("region", { name: "הפוקימון השני" }).getByRole("button", { name: "מהאוסף שלי" }).click();
    await page.getByRole("button", { name: /ישנוני/ }).click();
    await page.getByRole("button", { name: "השוואה!" }).click();
    await expect(page.getByText("שני הפוקימונים בערך באותה רמת נדירות!")).toBeVisible();
  });

  test("wishlist: add, persists, mark obtained moves to collection", async ({ page }) => {
    await page.goto("/wishlist/");
    await page.getByRole("button", { name: "הוספת משאלה" }).click();
    await page.getByRole("combobox").fill("לוגיה");
    await page.getByRole("option", { name: /לוגיה/ }).first().click();
    await page.getByRole("button", { name: "הוספה למשאלות" }).click();
    await expect(page.getByRole("button", { name: "השגתי!" })).toBeVisible();
    await page.reload();
    await expect(page.getByText("לוגיה").first()).toBeVisible();
    await page.getByRole("button", { name: "השגתי!" }).click();
    await expect(page.getByText("עוד אין משאלות")).toBeVisible();
    await page.goto("/collection/");
    await expect(page.getByText("לוגיה").first()).toBeVisible();
  });

  test("backup export and import", async ({ page }) => {
    await page.goto("/");
    await pick(page, "הפוקימון שלי", "eevee", /איבי/);
    await page.getByRole("region", { name: "הפוקימון שלי" }).getByRole("button", { name: "הוספה לאוסף" }).click();
    await expect(page.getByText("נוסף! ✓")).toBeVisible();
    await page.goto("/collection/");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "שמירת גיבוי" }).click();
    const file = await (await download).path();
    await page.goto("/settings/");
    await page.getByRole("button", { name: "מחיקת כל הנתונים שלי" }).click();
    await page.getByRole("button", { name: "מחיקה" }).click();
    await expect(page.getByText("הנתונים נמחקו.")).toBeVisible();
    await page.goto("/collection/");
    await expect(page.getByText("האוסף ריק")).toBeVisible();
    await page.getByTestId("import-file").setInputFiles(file!);
    await expect(page.getByText("איבי").first()).toBeVisible();
  });
});

test.describe("layout, language, accessibility basics", () => {
  for (const path of ["/", "/rankings/", "/pokedex/", "/pokemon/25/", "/collection/", "/wishlist/", "/help/", "/settings/"]) {
    test(`no horizontal scroll, RTL and one h1 on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.dir)).toBe("rtl");
      await expect(page.locator("h1")).toHaveCount(1);
      // every button/link has an accessible name
      const unnamed = await page.evaluate(() =>
        [...document.querySelectorAll("button, a")].filter((el) => !(el.getAttribute("aria-label") || el.textContent?.trim() || el.getAttribute("title"))).length,
      );
      expect(unnamed).toBe(0);
    });
  }

  test("English UI is available and LTR", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to English" }).click();
    await expect(page.getByRole("heading", { name: "Which one is rarer?" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dir)).toBe("ltr");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Which one is rarer?" })).toBeVisible();
  });

  test("no Stardust feature anywhere", async ({ page }) => {
    for (const path of ["/", "/help/", "/collection/entry/"]) {
      await page.goto(path);
      await expect(page.getByText(/stardust|אבק כוכבים/i)).toHaveCount(0);
    }
  });
});
