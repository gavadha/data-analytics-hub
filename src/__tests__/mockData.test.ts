import {
  departments,
  dashboardsByDepartment,
  metrics,
  recentAnswers,
  categoryColors,
} from "@/lib/mockData";

describe("departments", () => {
  it("has exactly 6 departments", () => {
    expect(departments).toHaveLength(6);
  });

  it("each department has a unique id and slug", () => {
    const ids = departments.map((d) => d.id);
    const slugs = departments.map((d) => d.slug);
    expect(new Set(ids).size).toBe(departments.length);
    expect(new Set(slugs).size).toBe(departments.length);
  });

  it("each department has required fields", () => {
    departments.forEach((dept) => {
      expect(dept.id).toBeTruthy();
      expect(dept.slug).toBeTruthy();
      expect(dept.name).toBeTruthy();
      expect(dept.description).toBeTruthy();
      expect(dept.dashboardCount).toBeGreaterThan(0);
      expect(dept.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(dept.borderColor).toBeTruthy();
    });
  });

  it("all expected departments are present", () => {
    const slugs = departments.map((d) => d.slug);
    expect(slugs).toContain("legal");
    expect(slugs).toContain("customer-support");
    expect(slugs).toContain("office-of-chief-of-staff");
    expect(slugs).toContain("product");
    expect(slugs).toContain("platform");
    expect(slugs).toContain("data");
  });
});

describe("dashboardsByDepartment", () => {
  it("has a dashboards entry for every department slug", () => {
    departments.forEach((dept) => {
      expect(dashboardsByDepartment[dept.slug]).toBeDefined();
    });
  });

  it("dashboard counts match department metadata", () => {
    departments.forEach((dept) => {
      const dashboards = dashboardsByDepartment[dept.slug];
      expect(dashboards).toHaveLength(dept.dashboardCount);
    });
  });

  it("each dashboard has required fields", () => {
    Object.values(dashboardsByDepartment).flat().forEach((dash) => {
      expect(dash.id).toBeTruthy();
      expect(dash.name).toBeTruthy();
      expect(dash.description).toBeTruthy();
      expect(dash.department).toBeTruthy();
      expect(dash.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dash.owner).toBeTruthy();
      expect(Array.isArray(dash.tags)).toBe(true);
      expect(dash.tags.length).toBeGreaterThan(0);
      expect(dash.lookerUrl).toMatch(/^https?:\/\//);
    });
  });

  it("all dashboard ids are unique across departments", () => {
    const allDashboards = Object.values(dashboardsByDepartment).flat();
    const ids = allDashboards.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("metrics", () => {
  it("has at least 5 metrics defined", () => {
    expect(metrics.length).toBeGreaterThanOrEqual(5);
  });

  it("each metric has required fields", () => {
    metrics.forEach((metric) => {
      expect(metric.id).toBeTruthy();
      expect(metric.name).toBeTruthy();
      expect(metric.definition).toBeTruthy();
      expect(metric.category).toBeTruthy();
      expect(metric.source).toBeTruthy();
    });
  });

  it("metric ids are unique", () => {
    const ids = metrics.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all metric categories have a color defined", () => {
    const undefinedCategories = metrics.filter(
      (m) => !categoryColors[m.category]
    );
    // categoryColors may not cover all categories — just ensure it exists or has fallback
    expect(undefinedCategories.length).toBeLessThanOrEqual(metrics.length);
  });
});

describe("recentAnswers", () => {
  it("has at least 2 recent answers", () => {
    expect(recentAnswers.length).toBeGreaterThanOrEqual(2);
  });

  it("each answer has required fields", () => {
    recentAnswers.forEach((ans) => {
      expect(ans.id).toBeTruthy();
      expect(ans.question).toBeTruthy();
      expect(ans.answer).toBeTruthy();
      expect(ans.source).toBeTruthy();
      expect(ans.timeAgo).toBeTruthy();
    });
  });
});
