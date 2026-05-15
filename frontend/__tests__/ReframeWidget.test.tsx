import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReframeWidget, type ReframeTool } from "../app/ReframeWidget";

const TOOL: ReframeTool = {
  original_thought: "I always mess everything up",
  distortion_type: "overgeneralization",
  reframe: "One mistake doesn't define a pattern",
  evidence_against: [
    "You completed a project successfully last week",
    "You've handled difficult situations before",
    "You're seeking help, which shows self-awareness",
  ],
};

describe("ReframeWidget — content rendering", () => {
  it("renders the distortion type pill", () => {
    render(<ReframeWidget tool={TOOL} />);
    expect(screen.getByText(/Overgeneralization/i)).toBeInTheDocument();
  });

  it("renders the original thought text", () => {
    render(<ReframeWidget tool={TOOL} />);
    expect(screen.getByText(/I always mess everything up/)).toBeInTheDocument();
  });

  it("renders the reframe text", () => {
    render(<ReframeWidget tool={TOOL} />);
    expect(screen.getByText("One mistake doesn't define a pattern")).toBeInTheDocument();
  });

  it("renders all evidence_against items", () => {
    render(<ReframeWidget tool={TOOL} />);
    expect(screen.getByText(/You completed a project successfully/)).toBeInTheDocument();
    expect(screen.getByText(/You've handled difficult situations/)).toBeInTheDocument();
    expect(screen.getByText(/You're seeking help/)).toBeInTheDocument();
  });

  it("renders the correct number of evidence items", () => {
    render(<ReframeWidget tool={TOOL} />);
    // Each item is prefixed with "· "
    expect(screen.getAllByText(/^·/).length).toBe(TOOL.evidence_against.length);
  });
});

describe("ReframeWidget — distortion definition toggle", () => {
  it("does not show definition text initially", () => {
    render(<ReframeWidget tool={TOOL} />);
    expect(screen.queryByText(/One bad event becomes/)).not.toBeInTheDocument();
  });

  it("clicking the pill reveals the definition", () => {
    render(<ReframeWidget tool={TOOL} />);
    fireEvent.click(screen.getByText(/Overgeneralization/i));
    expect(screen.getByText(/One bad event becomes/)).toBeInTheDocument();
  });

  it("clicking the pill a second time hides the definition", () => {
    render(<ReframeWidget tool={TOOL} />);
    fireEvent.click(screen.getByText(/Overgeneralization/i));
    fireEvent.click(screen.getByText(/Overgeneralization/i));
    expect(screen.queryByText(/One bad event becomes/)).not.toBeInTheDocument();
  });
});

describe("ReframeWidget — all distortion types", () => {
  const cases: Array<[ReframeTool["distortion_type"], string, RegExp]> = [
    ["catastrophizing",    "Catastrophizing",    /worst possible outcome/i],
    ["overgeneralization", "Overgeneralization",  /One bad event/i],
    ["all_or_nothing",     "All-or-Nothing",      /black and white/i],
    ["mind_reading",       "Mind Reading",        /what others are thinking/i],
    ["fortune_telling",    "Fortune Telling",     /Predicting the future/i],
    ["personalization",    "Personalization",     /Taking personal blame/i],
    ["filtering",          "Filtering",           /Focusing exclusively on negatives/i],
  ];

  test.each(cases)("%s — renders label and definition", (type, label, defRegex) => {
    const tool: ReframeTool = { ...TOOL, distortion_type: type };
    render(<ReframeWidget tool={tool} />);
    expect(screen.getByText(new RegExp(label, "i"))).toBeInTheDocument();
    fireEvent.click(screen.getByText(new RegExp(label, "i")));
    expect(screen.getByText(defRegex)).toBeInTheDocument();
  });
});
