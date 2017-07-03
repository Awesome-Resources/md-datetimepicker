/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  NgZone,
  Optional,
  Output,
  ViewEncapsulation,
  ViewChild,
  Host
} from '@angular/core';
import {
  DOWN_ARROW,
  END,
  ENTER,
  HOME,
  LEFT_ARROW,
  PAGE_DOWN,
  PAGE_UP,
  RIGHT_ARROW,
  UP_ARROW,
  MATERIAL_COMPATIBILITY_MODE,
  MD_DATE_FORMATS,
  MdDateFormats
}
from '@angular/material';
import {MdDatetimepickerIntl} from './datetimepicker-intl';
import {MdDatetimepicker} from './datetimepicker';
import {createMissingDateImplError} from './datetimepicker-errors';
import {DateAdapter} from './native-date-module/index';

/**
 * A calendar that is used as part of the datetimepicker.
 * @docs-private
 */
@Component({
  selector: 'md-timesheet',
  templateUrl: 'timesheet.html',
  styleUrls: ['calendar.css'],
  host: {
    'class': 'mat-calendar',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MdTimesheet<D> implements AfterContentInit {
  
  /** The view that the picker should start in. */
  @Input() pickerView: 'timesheet' | 'calendar' = 'calendar';

  /** The currently selected date. */
  @Input() selected: D;

  /** The minimum selectable date. */
  @Input() minDate: D;

  /** The maximum selectable date. */
  @Input() maxDate: D;

  /** A function used to filter which dates are selectable. */
  @Input() dateFilter: (date: D) => boolean;

  /** Date filter for the month and year views. */
  _dateFilterForViews = (date: D) => {
    return !!date &&
        (!this.dateFilter || this.dateFilter(date)) &&
        (!this.minDate || this._dateAdapter.compareDate(date, this.minDate) >= 0) &&
        (!this.maxDate || this._dateAdapter.compareDate(date, this.maxDate) <= 0);
  }
  /** Emits changes to selected date, not [date] of [value] which are changed on save. */
  @Output() selectedChange = new EventEmitter<D>();

  /** Emits changes to [date] and [value]. These are reflected in the input */
  @Output() save = new EventEmitter<D>();

  /** The date of the month that today falls on. Null if today is in another month. */
  private _selected: D;

  @Input() timeView: 'timesheet' | 'calendar' = 'calendar';

  /* toggle timepicker */
  _timeView: boolean;
 
  /* Afternoon time*/
  pm:boolean;

  /* ampm button label*/
  _ampm:string;

  /* set ampm button label */
  get ampm():string{
    return this._ampm;
  };

  set ampm(label:string){
    this._ampm = label;
  };

  /* get hours */
  _getClockHrs():string{
    let time:string = this._dateAdapter.toLocaleTimeString(this._selected);
    let timeArr = time.split(":");
    return timeArr[0];
  }
  /* get minutes */
  _getClockMins():string{
    let time:string = this._dateAdapter.toLocaleTimeString(this._selected);
    let timeArr = time.split(":");
    return timeArr[1];
  }

  /* Decrease hours by one hour onclick */
  _decreaseHoursClicked(){
    this._selected = this._dateAdapter.setHours(this._selected, this._dateAdapter.getHours(this._selected) - 1);
    this._timeSelected();
  }

  /* Increase hours by one hour onclick */
  _increaseHoursClicked(){
    this._selected = this._dateAdapter.setHours(this._selected, this._dateAdapter.getHours(this._selected) + 1);
    this._timeSelected();
  }
  /* Increase minutes by one minute onclick */
  _increaseMinutesClicked(){
    this._selected = this._dateAdapter.setMinutes(this._selected, this._dateAdapter.getMinutes(this._selected) + 1);
    this._timeSelected();
  }

  /* Decrease minutes by one minute onclick */
  _decreaseMinutesClicked(){
    this._selected = this._dateAdapter.setMinutes(this._selected, this._dateAdapter.getMinutes(this._selected) - 1);
    this._timeSelected();
  }

  /* ampm toggle onclick */
  _pmClicked(){
    if(this.pm){
      this.ampm = "AM";
      this._selected = this._dateAdapter.setHours(this._selected, this._dateAdapter.getHours(this._selected) - 12);
    }else{
      this.ampm = "PM";
      this._selected = this._dateAdapter.setHours(this._selected, this._dateAdapter.getHours(this._selected) + 12);
    }
    this.pm = !this.pm;
    this._timeSelected();
  }

  /* An array of intl.datetime that is split by coma and displayed in timepicker header*/
  _dateArr: Array<string>;

  /**
   * The current active date. This determines which time period is shown and which date is
   * highlighted when using keyboard navigation.
   */
  get _activeDate(): D { return this._clampedActiveDate; }
  set _activeDate(value: D) {
    this._clampedActiveDate = this._dateAdapter.clampDate(value, this.minDate, this.maxDate);
  }
  private _clampedActiveDate: D;
  
  /* Calendar height. This is set by MdDatetimpicker<D> class (parent) */
  @Input()
  get calHeight():string{
    return this._calHeight;
  }
  /* The setter also sets timeHeight */
  set calHeight(value:string){
    let headerHeight = 84;
    let footerControls = 40;
    this._calHeight = value;
    this.timeHeight = parseInt(value) - headerHeight - footerControls + "px";
  }
  private _calHeight:string;
 
  /* Sets the time picker content area height */
  @Input()
  get timeHeight():string{
    return this._timeHeight;
  }
  set timeHeight(value:string){
    this._timeHeight = value;
  }
  private _timeHeight:string;

  /** Set as datepicker only; No timepicker*/
  @Input()
  get hideTime():boolean{
    return this._hideTime;
  }
  set hideTime(value:boolean){
    this._hideTime = value;
  }
  private _hideTime:boolean;
  
  /** Whether the calendar is in month view. */
  _pickerView: boolean;

 /** The date to open the calendar to initially. */
  @Input()
  get date(): D {
    // If an explicit startAt is set we start there, otherwise we start at whatever the currently
    // selected value is.
    return this._date;
  }
  set date(date: D) {
    this._date = date;
  }
  private _date: D;

  /** The label for the the hours increase button. */
  get _increaseHoursButtonLabel(): string {
    return this._intl.increaseHoursButtonLabel;
  }

  /** The label for th hours decrease button. */
  get _decreaseHoursButtonLabel(): string {
    return this._intl.decreaseHoursButtonLabel;
  }

  /** The label for the minutes increase button. */
  get _increaseMinutesButtonLabel(): string {
    return this._intl.increaseMinutesButtonLabel;
  }

  /** The label for the minutes increase button. */
  get _idecreaseMinutesButtonLabel(): string {
    return this._intl.decreaseMinutesButtonLabel;
  }

  /** The label for displaying AM or PM */
  get _ampmButtonLabel(): string {
    return this._intl.ampmButtonLabel;
  }

  constructor(private _elementRef: ElementRef,
              private _intl: MdDatetimepickerIntl,
              private _ngZone: NgZone,
              @Optional() @Inject(MATERIAL_COMPATIBILITY_MODE) public _isCompatibilityMode: boolean,
              @Optional() private _dateAdapter: DateAdapter<D>,
              @Optional() @Inject(MD_DATE_FORMATS) private _dateFormats: MdDateFormats) {
    if (!this._dateAdapter) {
      throw createMissingDateImplError('DateAdapter');
    }
    if (!this._dateFormats) {
      throw createMissingDateImplError('MD_DATE_FORMATS');
    }
  }

  ngAfterContentInit() {
    let today = new Date();
    this._elementRef.nativeElement.style.height = this.calHeight;
    this._selected = this.selected || this._dateAdapter.today();
    this._dateArr = this._dateAdapter.format(this._selected, this._dateFormats.display['dateHeader']).split(',');
    this._timeView = this.pickerView != 'calendar';
    this.pm = this._dateAdapter.isPm(this._selected);
    this.ampm = (this.pm)?"PM":"AM";
  }

  ngOnChanges(){
    if(this._selected){
      if(this.ampm === "AM" && this._dateAdapter.isPm(this._selected)){
        this._selected = this._dateAdapter.setHours(this._selected, this._dateAdapter.getHours(this._selected) - 12);
      }else if(this.ampm === "PM" && !this._dateAdapter.isPm(this._selected)){
        this._selected = this._dateAdapter.setHours(this._selected, this._dateAdapter.getHours(this._selected) + 12);
      }
    }
  }

  @Output() closeDialog: EventEmitter<boolean> = new EventEmitter<boolean>();

  _closeDialog(): void {
    this.closeDialog.emit(true);
  }
  
  /* time changed in picker */
  _timeSelected():void{
    this.selectedChange.emit( this._selected );
  }
  
  /* saves date to input [value] and [date] if applicable. Closes dialog. */
   _save():void{
    this.save.emit( this._selected );
  }

}