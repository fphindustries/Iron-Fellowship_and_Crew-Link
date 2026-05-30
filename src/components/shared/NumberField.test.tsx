import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { NumberField } from "./NumberField";
import { renderWithProviders } from "test/renderWithProviders";

describe("NumberField", () => {
  it("renders the given numeric value", () => {
    renderWithProviders(
      <NumberField value={42} onChange={vi.fn()} label="Health" />
    );
    const input = screen.getByLabelText("Health") as HTMLInputElement;
    expect(input.value).toBe("42");
  });

  it("calls onChange with a parsed number when the user types digits", () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberField value={0} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("calls onChange with undefined when the field is cleared", () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberField value={5} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("strips non-numeric characters before parsing", () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberField value={0} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "abc5def" } });
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
