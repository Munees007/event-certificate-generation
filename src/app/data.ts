import { Injectable } from '@angular/core';
import { eventType } from './types/event';

@Injectable({
  providedIn: 'root',
})
export class Data {
  eventData: eventType[] = []
}
