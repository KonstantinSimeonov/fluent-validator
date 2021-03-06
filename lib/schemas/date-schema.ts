import { IValidationError } from '../contracts';
import { createError, ERROR_TYPES } from '../errors';
import * as is from '../is';
import BaseSchema from './base-schema';

export const name = 'date';

const typeName = 'date';

const validatePositiveInteger = (bound: any): bound is number => Number.isInteger(bound) && (0 <= bound);

const isInRange = (
	start: number,
	end: number,
	value: number,
) => start < end
	? start <= value && value <= end
	: value <= end || start <= value;

/**
 * This function is here because typescript is stupid and doesn't understand
 * javascript types and has not compile time templating.
 * @param {keyof Date} componentName
 * @param {Date} dateInstance
 * @returns {number}
 */
function getDateComponent(componentName: keyof Date, dateInstance: Date): number {
	switch (componentName) {
		case 'getSeconds':
		case 'getMinutes':
		case 'getHours':
		case 'getDay':
		case 'getMonth':
		case 'getDate':
		case 'getFullYear':
			return dateInstance[componentName]();
		default:
			throw new Error('Should never happen in production.');
	}
}

const betweenValidation = (
	start: number,
	end: number,
	ranges: { [key: string]: number },
	dateGetFnKey: keyof Date,
) => {
	const dateComponentName = dateGetFnKey.replace(/get/, '');
	if (!is.Undefined(ranges['_start' + dateComponentName] && ranges['_end' + dateComponentName])) {
		throw new Error(`Cannot set start and end for ${dateComponentName} twice on a single DateSchema instance`);
	}

	if (!validatePositiveInteger(start) || !validatePositiveInteger(end)) {
		throw new TypeError(
			`Expected integer numbers for start and end of ${dateComponentName}, but got ${start} and ${end}`,
		);
	}

	ranges['_start' + dateComponentName] = start;
	ranges['_end' + dateComponentName] = end;

	return (value: Date, path: string) => {
		const rstart = ranges['_start' + dateComponentName];
		const rend = ranges['_end' + dateComponentName];
		const valueNumber = getDateComponent(dateGetFnKey, value);

		return isInRange(rstart, rend, valueNumber)
			? undefined
			: createError(
				ERROR_TYPES.RANGE,
				`Expected ${dateComponentName} to be in range ${start}:${end} but got ${value}`,
				path,
			);
	};
};

type TDateSchemaState = {
	_before?: Date;
	_after?: Date;
	ranges: { [key: string]: number };
};

export default class DateSchema extends BaseSchema<Date> {
	protected validationFunctions: Array<((value: Date, path: string) => IValidationError)> = [];
	private _state: TDateSchemaState;

	constructor() {
		super();
		this._state = { ranges: {} };
	}

	public get type() {
		return typeName;
	}

	/**
	 * Validate whether the provided value is a Date object. Only date objects with valid time are considered valid dates.
	 * @param {any} value - The value to be checked for type Date.
	 * @returns {Boolean}
	 */
	public validateType(value: any): value is Date {
		return is.Date(value) && !Number.isNaN(value.getTime());
	}

	/**
	 * Introduce a before validation to the schema instance:
	 * every date equal to or after the provided will be considered invalid.
	 * @param {any} dateConstructorArgs - Arguments that you will typically pass to the Date constructor.
	 * @returns {DateSchema} - Returns the current DateSchema instance to enable chaining.
	 */
	public before<T>(...dateConstructorArgs: T[]) {
		if (!is.Undefined(this._state._before)) {
			throw new Error('Cannot set before date twice for a date schema instance');
		}

		// @ts-ignore
		const beforeDate = new Date(...dateConstructorArgs);

		if (!this.validateType(beforeDate)) {
			throw new TypeError(`The value provided to .before() is not a valid date string or object ${dateConstructorArgs}`);
		}

		const { _state } = this;

		_state._before = beforeDate;

		this.pushValidationFn((value: Date, path: string) => {
			if (!is.NullOrUndefined(_state._before) && value >= _state._before) {
				return createError(ERROR_TYPES.RANGE, `Expected date before ${_state._before} but got ${value}`, path);
			}
		});

		return this;
	}

	/**
	 * Introduce an after validation to the schema instance:
	 * every date equal to or before the provided will be considered invalid.
	 * @param {any} dateConstructorArgs - Arguments that you will typically pass to the Date constructor.
	 * @returns {DateSchema} - Returns the current DateSchema instance to enable chaining.
	 */
	public after<T>(...dateConstructorArgs: T[]) {
		if (!is.Undefined(this._state._after)) {
			throw new Error('Cannot set after date twice for a date schema instance');
		}

		// @ts-ignore
		const afterDate = new Date(...dateConstructorArgs);

		if (!this.validateType(afterDate)) {
			throw new TypeError(`The value provided to .after() is not a valid date string or object ${dateConstructorArgs}`);
		}

		const { _state } = this;

		_state._after = afterDate;

		this.pushValidationFn((value, path) => {
			if (!is.NullOrUndefined(_state._after) && value <= _state._after) {
				return createError(ERROR_TYPES.RANGE, `Expected date after ${_state._after} but got ${value}`, path);
			}
		});

		return this;
	}

	/**
	 * Set validation for range on date in month.
	 * If start < end, value will be validated against the range [start, end]
	 * If start > end, value will be validated against the ranges [0, start] and [end, 31]
	 */
	public dateBetween(start: number, end: number) {
		return this.pushValidationFn(
			betweenValidation(start, end, this._state.ranges, 'getDate'),
		);
	}

	public monthBetween(start: number, end: number) {
		return this.pushValidationFn(
			betweenValidation(start, end, this._state.ranges, 'getMonth'),
		);
	}

	public hourBetween(start: number, end: number) {
		return this.pushValidationFn(
			betweenValidation(start, end, this._state.ranges, 'getHours'),
		);
	}

	public weekdayBetween(start: number, end: number) {
		return this.pushValidationFn(
			betweenValidation(start, end, this._state.ranges, 'getDay'),
		);
	}

	public minutesBetween(start: number, end: number) {
		return this.pushValidationFn(
			betweenValidation(start, end, this._state.ranges, 'getMinutes'),
		);
	}

	public secondsBetween(start: number, end: number) {
		return this.pushValidationFn(
			betweenValidation(start, end, this._state.ranges, 'getSeconds'),
		);
	}
}
