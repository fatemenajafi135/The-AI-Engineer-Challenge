import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrepWidget, type PrepTool } from "../app/PrepWidget";

const INTERVIEW: PrepTool = {
  situation_type: "interview",
  event_description: "A technical interview at a top tech company",
  worries: ["I'll freeze under pressure", "I won't know the answers"],
  reframes: [
    "Freezing is normal and temporary",
    "Not knowing is a chance to show your reasoning",
  ],
  anchors: [
    "Take 3 deep breaths before entering",
    "Recall a past win",
    "Remember: they want you to succeed",
  ],
};

const HARD_CONVO: PrepTool = {
  situation_type: "hard_conversation",
  event_description: "Telling my manager I need a raise",
  worries: ["They'll say no", "It'll be awkward"],
  reframes: ["A 'no' just delays the conversation", "Awkwardness fades quickly"],
  anchors: ["Breathe before you speak", "Know your value", "Stay grounded"],
  scripts: [
    { tone: "direct",  text: "I'd like to discuss my compensation openly." },
    { tone: "gentle",  text: "I was hoping we could talk about my growth here." },
    { tone: "written", text: "Hi — I'd love to find time to discuss my role and pay." },
  ],
};

describe("PrepWidget — header and description", () => {
  it("renders the situation type pill for interview", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    expect(screen.getByText("Interview")).toBeInTheDocument();
  });

  it("renders the event description", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    expect(screen.getByText("A technical interview at a top tech company")).toBeInTheDocument();
  });

  it("renders 'Hard Conversation' pill for hard_conversation type", () => {
    render(<PrepWidget tool={HARD_CONVO} />);
    expect(screen.getByText("Hard Conversation")).toBeInTheDocument();
  });
});

describe("PrepWidget — worries and reframes", () => {
  it("renders all worries", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    expect(screen.getByText("I'll freeze under pressure")).toBeInTheDocument();
    expect(screen.getByText("I won't know the answers")).toBeInTheDocument();
  });

  it("renders all reframes", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    expect(screen.getByText("Freezing is normal and temporary")).toBeInTheDocument();
    expect(screen.getByText("Not knowing is a chance to show your reasoning")).toBeInTheDocument();
  });

  it("renders the → arrow between each worry and reframe", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    const arrows = screen.getAllByText("→");
    expect(arrows.length).toBe(INTERVIEW.worries.length);
  });
});

describe("PrepWidget — anchor checkboxes", () => {
  function getAnchorRows() {
    return screen.getAllByRole("checkbox").filter(
      (el) => el.tagName === "DIV"
    );
  }

  it("renders all anchors", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    expect(screen.getByText("Take 3 deep breaths before entering")).toBeInTheDocument();
    expect(screen.getByText("Recall a past win")).toBeInTheDocument();
    expect(screen.getByText("Remember: they want you to succeed")).toBeInTheDocument();
  });

  it("anchors are unchecked initially", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    const inputs = document.querySelectorAll("input[type=checkbox]");
    inputs.forEach((input) => {
      expect((input as HTMLInputElement).checked).toBe(false);
    });
  });

  it("clicking an anchor row checks its checkbox", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    const anchorText = screen.getByText("Take 3 deep breaths before entering");
    const anchorRow  = anchorText.closest("[role=checkbox]") as HTMLElement;
    fireEvent.click(anchorRow);
    const checkbox = anchorRow.querySelector("input[type=checkbox]") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("clicking a checked anchor unchecks it", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    const anchorText = screen.getByText("Recall a past win");
    const anchorRow  = anchorText.closest("[role=checkbox]") as HTMLElement;
    fireEvent.click(anchorRow);
    fireEvent.click(anchorRow);
    const checkbox = anchorRow.querySelector("input[type=checkbox]") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("different anchors can be checked independently", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    const row0 = (screen.getByText("Take 3 deep breaths before entering")).closest("[role=checkbox]") as HTMLElement;
    const row1 = (screen.getByText("Recall a past win")).closest("[role=checkbox]") as HTMLElement;
    fireEvent.click(row0);
    expect((row0.querySelector("input") as HTMLInputElement).checked).toBe(true);
    expect((row1.querySelector("input") as HTMLInputElement).checked).toBe(false);
  });
});

describe("PrepWidget — save button", () => {
  it("Save button is visible and enabled initially", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    const btn = screen.getByRole("button", { name: /Save this prep/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("clicking Save changes label to '✓ Saved'", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    fireEvent.click(screen.getByRole("button", { name: /Save this prep/i }));
    expect(screen.getByRole("button", { name: /✓ Saved/i })).toBeInTheDocument();
  });

  it("Save button is disabled after clicking", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    fireEvent.click(screen.getByRole("button", { name: /Save this prep/i }));
    expect(screen.getByRole("button", { name: /✓ Saved/i })).toBeDisabled();
  });

  it("saves to localStorage under 'mental_coach_preps'", () => {
    localStorage.clear();
    render(<PrepWidget tool={INTERVIEW} />);
    fireEvent.click(screen.getByRole("button", { name: /Save this prep/i }));
    const stored = JSON.parse(localStorage.getItem("mental_coach_preps") ?? "[]");
    expect(stored.length).toBe(1);
    expect(stored[0].situation_type).toBe("interview");
  });
});

describe("PrepWidget — no scripts section for non-hard-conversation", () => {
  it("does not render Scripts section for interview type", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    expect(screen.queryByText("Scripts")).not.toBeInTheDocument();
  });

  it("does not render Copy button when there are no scripts", () => {
    render(<PrepWidget tool={INTERVIEW} />);
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });
});

describe("PrepWidget — scripts section for hard_conversation", () => {
  it("renders the Scripts section heading", () => {
    render(<PrepWidget tool={HARD_CONVO} />);
    expect(screen.getByText("Scripts")).toBeInTheDocument();
  });

  it("renders a tab for each script tone", () => {
    render(<PrepWidget tool={HARD_CONVO} />);
    expect(screen.getByRole("button", { name: "Direct" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gentle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Written" })).toBeInTheDocument();
  });

  it("shows first script text by default", () => {
    render(<PrepWidget tool={HARD_CONVO} />);
    expect(screen.getByText("I'd like to discuss my compensation openly.")).toBeInTheDocument();
  });

  it("clicking Gentle tab shows gentle script text", () => {
    render(<PrepWidget tool={HARD_CONVO} />);
    fireEvent.click(screen.getByRole("button", { name: "Gentle" }));
    expect(screen.getByText("I was hoping we could talk about my growth here.")).toBeInTheDocument();
  });

  it("clicking Written tab shows written script text", () => {
    render(<PrepWidget tool={HARD_CONVO} />);
    fireEvent.click(screen.getByRole("button", { name: "Written" }));
    expect(screen.getByText("Hi — I'd love to find time to discuss my role and pay.")).toBeInTheDocument();
  });

  it("renders Copy button for scripts", () => {
    render(<PrepWidget tool={HARD_CONVO} />);
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("Copy button changes to 'Copied!' after click", async () => {
    // clipboard mock is set up in jest.setup.ts
    render(<PrepWidget tool={HARD_CONVO} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
    });
  });
});
