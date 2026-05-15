import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BreathingWidget, type BreathingTool } from "../app/BreathingWidget";

const BOX: BreathingTool    = { technique: "box",                cycles: 3, reason: "General stress reset" };
const SIGH: BreathingTool   = { technique: "physiological_sigh", cycles: 2, reason: "Acute panic reset" };
const F478: BreathingTool   = { technique: "4-7-8",              cycles: 4, reason: "Wind down" };

describe("BreathingWidget — technique names", () => {
  it("renders 'Box Breathing' for box technique", () => {
    render(<BreathingWidget tool={BOX} />);
    expect(screen.getByText("Box Breathing")).toBeInTheDocument();
  });

  it("renders 'Physiological Sigh' for physiological_sigh", () => {
    render(<BreathingWidget tool={SIGH} />);
    expect(screen.getByText("Physiological Sigh")).toBeInTheDocument();
  });

  it("renders '4-7-8 Breathing' for 4-7-8 technique", () => {
    render(<BreathingWidget tool={F478} />);
    expect(screen.getByText("4-7-8 Breathing")).toBeInTheDocument();
  });

  it("renders the reason text from the tool prop", () => {
    render(<BreathingWidget tool={BOX} />);
    expect(screen.getByText("General stress reset")).toBeInTheDocument();
  });
});

describe("BreathingWidget — idle state", () => {
  it("shows the Start button", () => {
    render(<BreathingWidget tool={BOX} />);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("does not show Pause or Skip in idle state", () => {
    render(<BreathingWidget tool={BOX} />);
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip" })).not.toBeInTheDocument();
  });

  it("does not show cycle counter in idle state", () => {
    render(<BreathingWidget tool={BOX} />);
    expect(screen.queryByText(/Cycle/)).not.toBeInTheDocument();
  });
});

describe("BreathingWidget — running state (after Start)", () => {
  it("shows Pause and Skip after clicking Start", () => {
    render(<BreathingWidget tool={BOX} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("hides the Start button after clicking Start", () => {
    render(<BreathingWidget tool={BOX} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
  });

  it("shows cycle counter after clicking Start", () => {
    render(<BreathingWidget tool={BOX} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByText(/Cycle 1/)).toBeInTheDocument();
  });

  it("shows total cycle count matching the tool prop", () => {
    render(<BreathingWidget tool={BOX} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByText(/of 3/)).toBeInTheDocument();
  });
});

describe("BreathingWidget — paused state", () => {
  it("shows Resume and Skip after clicking Pause", () => {
    render(<BreathingWidget tool={BOX} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("hides Pause after clicking it", () => {
    render(<BreathingWidget tool={BOX} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("clicking Resume returns to Pause + Skip", () => {
    render(<BreathingWidget tool={BOX} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });
});

describe("BreathingWidget — done state (after Skip)", () => {
  function skipToEnd() {
    render(<BreathingWidget tool={BOX} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  }

  it("shows the completion toast text", () => {
    skipToEnd();
    expect(screen.getByText(/Well done/i)).toBeInTheDocument();
  });

  it("shows mood option buttons", () => {
    skipToEnd();
    expect(screen.getByText(/Calm/)).toBeInTheDocument();
    expect(screen.getByText(/Better/)).toBeInTheDocument();
    expect(screen.getByText(/Still tense/)).toBeInTheDocument();
  });

  it("hides Start, Pause, Skip in done state", () => {
    skipToEnd();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip" })).not.toBeInTheDocument();
  });

  it("clicking a mood button shows acknowledgment text", () => {
    skipToEnd();
    fireEvent.click(screen.getByText(/Calm/));
    expect(screen.getByText(/keep going/i)).toBeInTheDocument();
  });

  it("clicking a mood button hides the mood picker", () => {
    skipToEnd();
    fireEvent.click(screen.getByText(/Better/));
    expect(screen.queryByText(/Still tense/)).not.toBeInTheDocument();
  });

  it("can also reach done by Pausing then Skipping", () => {
    render(<BreathingWidget tool={BOX} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByText(/Well done/i)).toBeInTheDocument();
  });
});
