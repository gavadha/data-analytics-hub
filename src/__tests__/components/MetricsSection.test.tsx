import { render, screen } from "@testing-library/react";
import MetricsSection from "@/components/MetricsSection";
import { metrics } from "@/lib/mockData";

describe("MetricsSection", () => {
  it("renders all metrics when no limit is passed", () => {
    render(<MetricsSection />);
    metrics.forEach((m) => {
      expect(screen.getByText(m.name)).toBeInTheDocument();
    });
  });

  it("respects the limit prop", () => {
    render(<MetricsSection limit={3} />);
    const shownMetrics = metrics.slice(0, 3);
    const hiddenMetrics = metrics.slice(3);

    shownMetrics.forEach((m) => {
      expect(screen.getByText(m.name)).toBeInTheDocument();
    });

    hiddenMetrics.forEach((m) => {
      expect(screen.queryByText(m.name)).not.toBeInTheDocument();
    });
  });

  it("shows 'View all' link when limit is provided", () => {
    render(<MetricsSection limit={3} />);
    expect(screen.getByText("View all →")).toBeInTheDocument();
  });

  it("does not show 'View all' link without limit", () => {
    render(<MetricsSection />);
    expect(screen.queryByText("View all →")).not.toBeInTheDocument();
  });

  it("renders each metric's category tag", () => {
    render(<MetricsSection limit={3} />);
    const shownMetrics = metrics.slice(0, 3);
    const uniqueCategories = [...new Set(shownMetrics.map((m) => m.category))];
    uniqueCategories.forEach((cat) => {
      expect(screen.getAllByText(cat).length).toBeGreaterThan(0);
    });
  });
});
