import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  SupportWidget,
  type SupportTool,
  type SupportResults,
} from "../app/SupportWidget";

const TOOL: SupportTool = {
  concern_type: "anxiety",
  format_preference: "either",
  language_preference: "English",
};

const MOCK_RESULTS: SupportResults = {
  query: { country: "Germany", city: "Berlin", language: "English" },
  results: [
    {
      name: "Berlin Therapy Center",
      type: "center",
      format: "in_person",
      description: "Specializes in CBT and anxiety",
      url: "https://berlintherapy.de",
    },
    {
      name: "Dr. Anna Müller",
      type: "therapist",
      format: "hybrid",
      description: "Bilingual therapist, English and German",
      url: "https://annamueller.de",
    },
  ],
  crisis: {
    name: "Telefonseelsorge",
    number: "0800 111 0 111",
    url: "https://www.telefonseelsorge.de",
  },
};

describe("SupportWidget — form stage (default)", () => {
  it("renders Country input", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
  });

  it("renders City input", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
  });

  it("renders Language preference input", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    expect(screen.getByPlaceholderText(/Farsi, Spanish/i)).toBeInTheDocument();
  });

  it("pre-fills language from tool.language_preference", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    const langInput = screen.getByPlaceholderText(/Farsi, Spanish/i) as HTMLInputElement;
    expect(langInput.value).toBe("English");
  });

  it("Find support button is disabled when both inputs are empty", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    expect(screen.getByRole("button", { name: /Find support/i })).toBeDisabled();
  });

  it("Find support button is disabled when only Country is filled", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "Germany" } });
    expect(screen.getByRole("button", { name: /Find support/i })).toBeDisabled();
  });

  it("Find support button is disabled when only City is filled", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "Berlin" } });
    expect(screen.getByRole("button", { name: /Find support/i })).toBeDisabled();
  });

  it("Find support button is enabled when both Country and City are filled", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "Germany" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "Berlin" } });
    expect(screen.getByRole("button", { name: /Find support/i })).not.toBeDisabled();
  });

  it("does not show result names in form stage", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    expect(screen.queryByText("Berlin Therapy Center")).not.toBeInTheDocument();
  });
});

describe("SupportWidget — results stage via initialResults", () => {
  it("skips the form and shows results immediately", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" initialResults={MOCK_RESULTS} />);
    expect(screen.getByText("Berlin Therapy Center")).toBeInTheDocument();
  });

  it("shows all result names", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" initialResults={MOCK_RESULTS} />);
    expect(screen.getByText("Berlin Therapy Center")).toBeInTheDocument();
    expect(screen.getByText("Dr. Anna Müller")).toBeInTheDocument();
  });

  it("shows result descriptions", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" initialResults={MOCK_RESULTS} />);
    expect(screen.getByText("Specializes in CBT and anxiety")).toBeInTheDocument();
  });

  it("shows result URLs as links", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" initialResults={MOCK_RESULTS} />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("https://berlintherapy.de");
    expect(hrefs).toContain("https://annamueller.de");
  });

  it("shows crisis resource name", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" initialResults={MOCK_RESULTS} />);
    expect(screen.getByText("Telefonseelsorge")).toBeInTheDocument();
  });

  it("shows crisis phone number", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" initialResults={MOCK_RESULTS} />);
    expect(screen.getByText("0800 111 0 111")).toBeInTheDocument();
  });

  it("shows location in results header", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" initialResults={MOCK_RESULTS} />);
    // The header reads "Support near Berlin, Germany"
    expect(screen.getByText(/Support near/)).toBeInTheDocument();
  });

  it("does not show the form inputs in results stage", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" initialResults={MOCK_RESULTS} />);
    expect(screen.queryByLabelText(/Country/i)).not.toBeInTheDocument();
  });

  it("clicking 'Search again' returns to the form", () => {
    render(<SupportWidget tool={TOOL} apiKey="sk-test" initialResults={MOCK_RESULTS} />);
    fireEvent.click(screen.getByRole("button", { name: /Search again/i }));
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
  });
});

describe("SupportWidget — search flow", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("calls fetch with the right endpoint on submit", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], crisis: null }),
    });

    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "Germany" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "Berlin" } });
    fireEvent.click(screen.getByRole("button", { name: /Find support/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/api/support/search");
  });

  it("transitions to loading state while fetching", async () => {
    let resolve!: (v: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((r) => { resolve = r; })
    );

    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "Germany" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "Berlin" } });
    fireEvent.click(screen.getByRole("button", { name: /Find support/i }));

    expect(screen.getByText(/Searching/i)).toBeInTheDocument();
    resolve({ ok: true, json: async () => ({ results: [], crisis: null }) });
  });

  it("shows results after successful fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: MOCK_RESULTS.results, crisis: MOCK_RESULTS.crisis }),
    });

    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "Germany" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "Berlin" } });
    fireEvent.click(screen.getByRole("button", { name: /Find support/i }));

    await waitFor(() => {
      expect(screen.getByText("Berlin Therapy Center")).toBeInTheDocument();
    });
  });

  it("calls onResultsSaved with correct query and results", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: MOCK_RESULTS.results, crisis: MOCK_RESULTS.crisis }),
    });

    const onResultsSaved = jest.fn();
    render(
      <SupportWidget tool={TOOL} apiKey="sk-test" onResultsSaved={onResultsSaved} />
    );
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "Germany" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "Berlin" } });
    fireEvent.click(screen.getByRole("button", { name: /Find support/i }));

    await waitFor(() => expect(onResultsSaved).toHaveBeenCalledTimes(1));

    const saved: SupportResults = onResultsSaved.mock.calls[0][0];
    expect(saved.query.country).toBe("Germany");
    expect(saved.query.city).toBe("Berlin");
    expect(saved.results).toHaveLength(2);
    expect(saved.crisis?.name).toBe("Telefonseelsorge");
  });

  it("shows error message on failed fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Service unavailable" }),
    });

    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "US" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "NYC" } });
    fireEvent.click(screen.getByRole("button", { name: /Find support/i }));

    await waitFor(() => {
      expect(screen.getByText(/Service unavailable/i)).toBeInTheDocument();
    });
  });

  it("shows Try again button on error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "US" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "NYC" } });
    fireEvent.click(screen.getByRole("button", { name: /Find support/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
    });
  });

  it("clicking Try again returns to the form", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("fail"));

    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "US" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "NYC" } });
    fireEvent.click(screen.getByRole("button", { name: /Find support/i }));

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    });

    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
  });
});

describe("SupportWidget — empty results", () => {
  it("shows no-results fallback when results array is empty", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], crisis: null }),
    });

    render(<SupportWidget tool={TOOL} apiKey="sk-test" />);
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: "Nowhere" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "Ghost Town" } });
    fireEvent.click(screen.getByRole("button", { name: /Find support/i }));

    await waitFor(() => {
      expect(screen.getByText(/No listings found/i)).toBeInTheDocument();
    });
  });
});
