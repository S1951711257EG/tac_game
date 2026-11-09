/** UI smoke tests: menu, campaign screen and one full battle turn flow. */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MainMenu } from "@/components/game/menu/MainMenu";
import { CampaignScreen } from "@/components/game/campaign/CampaignScreen";
import { BattleScreen } from "@/components/game/battle/BattleScreen";
import { useBattleStore } from "@/state/battleStore";
import { useCampaignStore } from "@/state/campaignStore";
import { useAppStore } from "@/state/appStore";
import { newCampaignState } from "@/game/campaignRules";
import { loadContent } from "@/game/content";
import { clearSave } from "@/game/save";

beforeEach(() => {
  cleanup();
  clearSave();
  useBattleStore.getState().reset();
  useCampaignStore.setState({ campaign: null, afterBattle: false });
  useAppStore.setState({ view: "menu" });
});

describe("MainMenu", () => {
  it("shows the title and campaign entry", () => {
    render(<MainMenu />);
    expect(screen.getByTestId("game-title")).toHaveTextContent("Iron Meridian");
    expect(screen.getByTestId("new-campaign")).toBeInTheDocument();
  });

  it("starts a campaign and moves to the campaign screen", () => {
    render(<MainMenu />);
    fireEvent.click(screen.getByTestId("new-campaign"));
    expect(useCampaignStore.getState().campaign).not.toBeNull();
    expect(useAppStore.getState().view).toBe("campaign");
  });
});

describe("CampaignScreen", () => {
  it("shows prestige, force hint and the available objective", () => {
    const def = loadContent().campaign;
    useCampaignStore.setState({ campaign: newCampaignState(def) });
    render(<CampaignScreen />);
    expect(screen.getByTestId("prestige")).toHaveTextContent("12");
    expect(screen.getByTestId("objective-list")).toHaveTextContent("First Contact");
    expect(screen.getByTestId("launch-bootcamp")).toBeInTheDocument();
  });

  it("launches a battle into the battle store", async () => {
    const def = loadContent().campaign;
    useCampaignStore.setState({ campaign: newCampaignState(def) });
    useAppStore.setState({ view: "campaign" });
    render(<CampaignScreen />);
    fireEvent.click(screen.getByTestId("launch-bootcamp"));
    await waitFor(() => {
      expect(useBattleStore.getState().session?.state.scenarioId).toBe("sc_bootcamp");
    });
  });
});

describe("BattleScreen flow", () => {
  it("runs a full turn: intro, begin, end turn, AI skip, back to player", async () => {
    const store = useBattleStore.getState();
    store.start("bootcamp", "sc_bootcamp", []);
    useAppStore.setState({ view: "battle" });
    render(<BattleScreen />);

    // Intro dialog gates the battle.
    expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("begin-battle"));
    await waitFor(() => expect(screen.queryByTestId("intro-dialog")).not.toBeInTheDocument());

    // Player turn 1: board rendered.
    expect(screen.getByTestId("turn-indicator").textContent).toContain("Your turn");
    expect(document.querySelectorAll('[role="gridcell"]').length).toBe(12 * 9);

    // End turn -> enemy acts.
    fireEvent.click(screen.getByTestId("end-turn"));
    await waitFor(() => expect(screen.getByTestId("ai-banner")).toBeInTheDocument());
    expect(screen.getByTestId("turn-indicator").textContent).toContain("Karsite turn");

    // Skip AI animations -> back to the player (turn 2).
    fireEvent.click(screen.getByText("Skip"));
    await waitFor(() => {
      expect(screen.getByTestId("turn-indicator").textContent).toContain("Your turn");
      expect(screen.getByTestId("turn-indicator").textContent).toContain("2 / 12");
    });
  });
});
