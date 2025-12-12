import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

interface SelectOption {
  id: string;
  name?: string; // Made optional
  [key: string]: any; // Allow other properties
}

@Component({
  selector: 'app-multi-select-dropdown',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './multi-select-dropdown.component.html',
  styleUrls: ['./multi-select-dropdown.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectDropdownComponent),
      multi: true
    }
  ]
})
export class MultiSelectDropdownComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder: string = 'Seleccione opciones';
  @Input() label: string = '';
  @Input() displayProperty: string = 'name'; // Property to display in the list

  selectedValues: string[] = [];
  isOpen: boolean = false;
  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() { }

  writeValue(value: string[]): void {
    if (value) {
      this.selectedValues = value;
    }
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Implement if needed
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    this.onTouched();
  }

  closeDropdown(): void {
    this.isOpen = false;
    this.onTouched();
  }

  onOptionClick(option: SelectOption): void {
    const index = this.selectedValues.indexOf(option.id);
    if (index > -1) {
      this.selectedValues.splice(index, 1); // Deselect
    } else {
      this.selectedValues.push(option.id); // Select
    }
    this.onChange(this.selectedValues);
  }

  removeOption(option: SelectOption): void {
    const index = this.selectedValues.indexOf(option.id);
    if (index > -1) {
      this.selectedValues.splice(index, 1);
      this.onChange(this.selectedValues);
    }
    // Keep dropdown open if it was open
    // this.onTouched(); // Don't mark as touched here to avoid closing dropdown
  }

  isSelected(option: SelectOption): boolean {
    return this.selectedValues.includes(option.id);
  }

  get selectedOptionNames(): string {
    if (this.selectedValues.length === 0) {
      return this.placeholder;
    }
    return this.options
      .filter(option => this.selectedValues.includes(option.id))
      .map(option => option[this.displayProperty])
      .join(', ');
  }

  get selectedOptions(): SelectOption[] {
    return this.options.filter(option => this.selectedValues.includes(option.id));
  }
}
