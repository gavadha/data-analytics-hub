import { render, screen } from "@testing-library/react";
import DepartmentCard from "@/components/DepartmentCard";
import { departments } from "@/lib/mockData";

const legalDept = departments.find((d) => d.slug === "legal")!;
const dataDept = departments.find((d) => d.slug === "data")!;

describe("DepartmentCard", () => {
  it("renders the department name", () => {
    render(<DepartmentCard department={legalDept} />);
    expect(screen.getByText("Legal")).toBeInTheDocument();
  });

  it("renders the department description", () => {
    render(<DepartmentCard department={legalDept} />);
    expect(screen.getByText(legalDept.description)).toBeInTheDocument();
  });

  it("renders the dashboard count", () => {
    render(<DepartmentCard department={legalDept} />);
    expect(screen.getByText(`${legalDept.dashboardCount} dashboards`)).toBeInTheDocument();
  });

  it("renders a link to the department page", () => {
    render(<DepartmentCard department={legalDept} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/department/legal");
  });

  it("renders data department correctly", () => {
    render(<DepartmentCard department={dataDept} />);
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText(`${dataDept.dashboardCount} dashboards`)).toBeInTheDocument();
  });

  it("all six departments render without errors", () => {
    departments.forEach((dept) => {
      const { unmount } = render(<DepartmentCard department={dept} />);
      expect(screen.getByText(dept.name)).toBeInTheDocument();
      unmount();
    });
  });
});
