import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Data } from '../../data';
import { eventType } from '../../types/event';
import { Student } from '../../types/user';
import { createZip, ZipEntry } from '../../utils/zip';

type OutputFormat = 'jpg' | 'png' | 'webp';
type FontWeightOption = '400' | '500' | '600' | '700';

interface TextItem {
  color: string;
  fontSize: number;
  fontWeight: FontWeightOption;
  key: string;
  label: string;
  maxWidthPercent: number;
  sample: string;
  xRatio: number;
  yRatio: number;
}

interface ImageBounds {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface MarkerDefinition {
  color: string;
  fontSize: number;
  fontWeight: FontWeightOption;
  key: string;
  label: string;
  maxWidthPercent: number;
}

const BASE_MARKERS: MarkerDefinition[] = [
  { key: 'eventName', label: 'Event Name', color: '#3b82f6', fontSize: 32, fontWeight: '700', maxWidthPercent: 70 },
  { key: 'nameAndRollNo', label: 'Name + Roll No', color: '#10b981', fontSize: 28, fontWeight: '700', maxWidthPercent: 38 },
  { key: 'academicInfo', label: "Year + Dept + 'Section'", color: '#ef4444', fontSize: 18, fontWeight: '500', maxWidthPercent: 34 },
  { key: 'prize', label: 'Prize', color: '#8b5cf6', fontSize: 24, fontWeight: '700', maxWidthPercent: 16 },
];

const CUSTOM_COLORS = ['#22c55e', '#06b6d4', '#f97316', '#eab308', '#ec4899', '#a855f7'];

@Component({
  selector: 'app-certificate-design',
  imports: [FormsModule],
  standalone: true,
  templateUrl: './certificate-design.html',
  styleUrl: './certificate-design.css',
})
export class CertificateDesign implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('certificateArea') certificateArea!: ElementRef<HTMLDivElement>;
  @ViewChild('previewCanvas') previewCanvas!: ElementRef<HTMLCanvasElement>;

  certificateImg: File | null = null;
  currentIndex = -1;
  eventData: eventType[] = [];
  generationMessage = '';
  isDragging = false;
  isGenerating = false;
  outputFormat: OutputFormat = 'jpg';
  text = '';
  textItems: TextItem[] = [];
  url = '';

  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private imageNaturalHeight = 0;
  private imageNaturalWidth = 0;
  private readonly markerSize = 14;
  private previewFrame: number | null = null;
  private templateImage: HTMLImageElement | null = null;

  constructor(private dataService: Data) {}

  ngOnInit() {
    this.eventData = Array.isArray(this.dataService.eventData) ? this.dataService.eventData : [];
    this.textItems = this.createBaseMarkers();
  }

  ngAfterViewInit() {
    this.schedulePreviewRender();
  }

  ngOnDestroy() {
    this.releasePreviewUrl();

    if (this.previewFrame !== null) {
      cancelAnimationFrame(this.previewFrame);
    }
  }

  async onFileChanged(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.certificateImg = file;
    await this.onImageSelected();
  }

  async onImageSelected() {
    if (!this.certificateImg) {
      return;
    }

    this.releasePreviewUrl();
    const previewUrl = URL.createObjectURL(this.certificateImg);

    try {
      const previewImage = await this.loadImage(previewUrl);
      this.url = previewUrl;
      this.templateImage = previewImage;
      this.imageNaturalWidth = previewImage.naturalWidth || previewImage.width;
      this.imageNaturalHeight = previewImage.naturalHeight || previewImage.height;
      this.generationMessage = '';
      this.schedulePreviewRender();
    } catch {
      URL.revokeObjectURL(previewUrl);
      this.generationMessage = 'Unable to load this image. Use JPG, PNG, or WEBP for reliable preview and export.';
    }
  }

  addItem() {
    const trimmedText = this.text.trim();

    if (!trimmedText) {
      return;
    }

    this.textItems.push(this.createCustomMarker(trimmedText, this.textItems.length));
    this.text = '';
    this.schedulePreviewRender();
  }

  onMarkerSettingsChange() {
    this.schedulePreviewRender();
  }

  startDrag(index: number, event: MouseEvent) {
    const target = event.currentTarget as HTMLElement | null;

    this.currentIndex = index;
    this.isDragging = true;

    if (target) {
      const rect = target.getBoundingClientRect();
      const markerCenterX = rect.left + rect.width / 2;
      const markerCenterY = rect.top + rect.height / 2;

      this.dragOffsetX = event.clientX - markerCenterX;
      this.dragOffsetY = event.clientY - markerCenterY;
    } else {
      this.dragOffsetX = 0;
      this.dragOffsetY = 0;
    }

    event.preventDefault();
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDragging || this.currentIndex === -1 || !this.certificateArea) {
      return;
    }

    const imageBounds = this.getImageBounds();
    const areaRect = this.certificateArea.nativeElement.getBoundingClientRect();
    const currentItem = this.textItems[this.currentIndex];

    if (!currentItem || imageBounds.width === 0 || imageBounds.height === 0) {
      return;
    }

    const imageX = event.clientX - areaRect.left - imageBounds.left - this.dragOffsetX;
    const imageY = event.clientY - areaRect.top - imageBounds.top - this.dragOffsetY;

    currentItem.xRatio = this.clamp(imageX / imageBounds.width, 0, 1);
    currentItem.yRatio = this.clamp(imageY / imageBounds.height, 0, 1);
    this.schedulePreviewRender();
  }

  stopDrag() {
    this.isDragging = false;
    this.currentIndex = -1;
  }

  getMarkerLeft(item: TextItem): number {
    const imageBounds = this.getImageBounds();
    return imageBounds.left + item.xRatio * imageBounds.width - this.markerSize / 2;
  }

  getMarkerTop(item: TextItem): number {
    const imageBounds = this.getImageBounds();
    return imageBounds.top + item.yRatio * imageBounds.height - this.markerSize / 2;
  }

  getFirstEvent(): eventType | undefined {
    return this.eventData[0];
  }

  getFirstStudent(): Student | undefined {
    return this.getFirstEvent()?.Students?.[0];
  }

  async downloadCertificatesZip() {
    if (this.isGenerating) {
      return;
    }

    if (!this.templateImage) {
      this.generationMessage = 'Upload a certificate background image before generating certificates.';
      return;
    }

    const participantsCount = this.getParticipantsCount();
    if (participantsCount === 0) {
      this.generationMessage = 'Add event and participant data on the previous page before generating certificates.';
      return;
    }

    this.isGenerating = true;
    this.generationMessage = 'Generating certificates zip...';

    try {
      const zipEntries = await this.buildZipEntries(this.templateImage);
      const zipBlob = createZip(zipEntries);

      this.downloadBlob(zipBlob, `certificates-${this.formatDateStamp(new Date())}.zip`);
      this.generationMessage = `Downloaded ${zipEntries.length} certificates as zip.`;
    } catch {
      this.generationMessage = 'Certificate generation failed. Please re-check the image file and data.';
    } finally {
      this.isGenerating = false;
    }
  }

  private createBaseMarkers(): TextItem[] {
    const firstEvent = this.eventData[0];
    const firstStudent = firstEvent?.Students?.[0];

    return BASE_MARKERS.map((marker, index) =>
      this.createMarkerItem(
        marker.key,
        marker.label,
        this.getMarkerSample(marker.key, firstEvent, firstStudent),
        marker.color,
        marker.fontSize,
        marker.fontWeight,
        marker.maxWidthPercent,
        index,
      ),
    );
  }

  private createMarkerItem(
    key: string,
    label: string,
    sample: string,
    color: string,
    fontSize: number,
    fontWeight: FontWeightOption,
    maxWidthPercent: number,
    index: number,
  ): TextItem {
    const itemsPerRow = 3;
    const column = index % itemsPerRow;
    const row = Math.floor(index / itemsPerRow);

    return {
      color,
      fontSize,
      fontWeight,
      key,
      label,
      maxWidthPercent,
      sample,
      xRatio: 0.18 + column * 0.28,
      yRatio: 0.16 + row * 0.22,
    };
  }

  private createCustomMarker(label: string, index: number): TextItem {
    const color = CUSTOM_COLORS[index % CUSTOM_COLORS.length];
    return this.createMarkerItem(`custom-${index}`, label, label, color, 22, '600', 35, index);
  }

  private getMarkerSample(key: string, event?: eventType, student?: Student): string {
    switch (key) {
      case 'eventName':
        return event?.name?.trim() || 'eventName';
      case 'nameAndRollNo':
        return this.getNameAndRoll(student);
      case 'academicInfo':
        return this.getAcademicText(student);
      case 'prize':
        return this.getPrizeText(student);
      default:
        return key;
    }
  }

  private getSalutation(student?: Student): string {
    if (student?.gender === 'Female') {
      return '-- Ms --';
    }

    if (student?.gender === 'Male') {
      return '-- Mr --';
    }

    return '-- Mr / Ms --';
  }

  private getNameAndRoll(student?: Student): string {
    const prefix = this.getNamePrefix(student);
    const name = student?.name?.trim();
    const rollNo = student?.rollNo?.trim().toUpperCase();
    const displayName = name ? `${prefix}${name}` : '';

    if (displayName && rollNo) {
      return `${displayName} - ${rollNo}`;
    }

    return displayName || rollNo || 'Mr. / Ms. name - rollNo';
  }

  private getAcademicText(student?: Student): string {
    const romanYear = student?.year ? this.toRoman(student.year) : '';
    const department = student?.department?.trim().toUpperCase() || '';
    const section = student?.includeSection !== false && student?.section ? ` '${student.section}'` : '';
    const value = `${romanYear}${romanYear && department ? ' ' : ''}${department}${section}`.trim();

    return value || "III BCA 'A'";
  }

  private getPrizeText(student?: Student): string {
    if (student?.includePrize === false) {
      return '';
    }

    return student?.prize || 'I';
  }

  private getImageBounds(): ImageBounds {
    if (!this.certificateArea) {
      return { left: 0, top: 0, width: 0, height: 0 };
    }

    const container = this.certificateArea.nativeElement.getBoundingClientRect();

    if (!this.imageNaturalWidth || !this.imageNaturalHeight) {
      return {
        left: 0,
        top: 0,
        width: container.width,
        height: container.height,
      };
    }

    const scale = Math.min(container.width / this.imageNaturalWidth, container.height / this.imageNaturalHeight);
    const width = this.imageNaturalWidth * scale;
    const height = this.imageNaturalHeight * scale;

    return {
      left: (container.width - width) / 2,
      top: (container.height - height) / 2,
      width,
      height,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private getParticipantsCount(): number {
    return this.eventData.reduce((count, event) => count + event.Students.length, 0);
  }

  private async buildZipEntries(templateImage: HTMLImageElement): Promise<ZipEntry[]> {
    const entries: ZipEntry[] = [];

    for (let eventIndex = 0; eventIndex < this.eventData.length; eventIndex += 1) {
      const currentEvent = this.eventData[eventIndex];
      const eventFolder = this.sanitizePart(currentEvent.name, `event-${eventIndex + 1}`);

      for (let studentIndex = 0; studentIndex < currentEvent.Students.length; studentIndex += 1) {
        const currentStudent = currentEvent.Students[studentIndex];
        const certificateBlob = await this.renderCertificate(templateImage, currentEvent, currentStudent);
        const certificateData = new Uint8Array(await certificateBlob.arrayBuffer());
        const studentName = this.sanitizePart(currentStudent.name, `participant-${studentIndex + 1}`);
        const rollNo = this.sanitizePart(currentStudent.rollNo, `roll-${studentIndex + 1}`);

        entries.push({
          data: certificateData,
          path: `certificates/${eventFolder}/${studentName}-${rollNo}.${this.outputFormat}`,
        });
      }
    }

    return entries;
  }

  private async renderCertificate(
    templateImage: HTMLImageElement,
    currentEvent: eventType,
    currentStudent: Student,
  ): Promise<Blob> {
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = templateImage.naturalWidth || templateImage.width;
    renderCanvas.height = templateImage.naturalHeight || templateImage.height;

    this.drawCertificate(renderCanvas, templateImage, currentEvent, currentStudent);

    return this.canvasToBlob(renderCanvas, this.getMimeType(), this.outputFormat === 'jpg' ? 0.92 : 1);
  }

  private drawCertificate(
    renderCanvas: HTMLCanvasElement,
    templateImage: HTMLImageElement,
    currentEvent: eventType,
    currentStudent: Student,
  ) {
    const context = renderCanvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas not supported');
    }

    context.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
    context.drawImage(templateImage, 0, 0, renderCanvas.width, renderCanvas.height);
    context.fillStyle = '#111827';
    context.textBaseline = 'middle';

    for (const item of this.textItems) {
      const text = this.resolveCertificateText(item, currentEvent, currentStudent).trim();

      if (!text) {
        continue;
      }

      context.font = `${item.fontWeight} ${item.fontSize}px "Times New Roman", Georgia, serif`;
      context.fillText(
        text,
        item.xRatio * renderCanvas.width,
        item.yRatio * renderCanvas.height,
        (item.maxWidthPercent / 100) * renderCanvas.width,
      );
    }
  }

  private resolveCertificateText(item: TextItem, currentEvent: eventType, currentStudent: Student): string {
    switch (item.key) {
      case 'eventName':
        return currentEvent.name || item.sample;
      case 'nameAndRollNo':
        return this.getNameAndRoll(currentStudent);
      case 'academicInfo':
        return this.getAcademicText(currentStudent);
      case 'prize':
        return this.getPrizeText(currentStudent);
      default:
        return item.sample;
    }
  }

  private schedulePreviewRender() {
    if (this.previewFrame !== null) {
      cancelAnimationFrame(this.previewFrame);
    }

    this.previewFrame = requestAnimationFrame(() => {
      this.previewFrame = null;
      void this.renderFirstParticipantPreview();
    });
  }

  private async renderFirstParticipantPreview() {
    const previewCanvas = this.previewCanvas?.nativeElement;
    const firstEvent = this.getFirstEvent();
    const firstStudent = this.getFirstStudent();

    if (!previewCanvas) {
      return;
    }

    const previewContext = previewCanvas.getContext('2d');
    if (!previewContext) {
      return;
    }

    if (!this.templateImage || !firstEvent || !firstStudent) {
      previewCanvas.width = 900;
      previewCanvas.height = 600;
      previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewContext.fillStyle = '#0f172a';
      previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewContext.fillStyle = '#94a3b8';
      previewContext.font = '600 24px "Times New Roman", Georgia, serif';
      previewContext.fillText('Preview will appear here after image upload and participant data.', 70, 300, 760);
      return;
    }

    previewCanvas.width = this.templateImage.naturalWidth || this.templateImage.width;
    previewCanvas.height = this.templateImage.naturalHeight || this.templateImage.height;
    this.drawCertificate(previewCanvas, this.templateImage, firstEvent, firstStudent);
  }

  private toRoman(value: number): string {
    const romanMap: Record<number, string> = {
      1: 'I',
      2: 'II',
      3: 'III',
      4: 'IV',
    };

    return romanMap[value] || String(value);
  }

  private getNamePrefix(student?: Student): string {
    if (student?.gender === 'Female') {
      return 'Ms. ';
    }

    if (student?.gender === 'Male') {
      return 'Mr. ';
    }

    return '';
  }

  private sanitizePart(value: string, fallback: string): string {
    const sanitized = value
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    return (sanitized || fallback).slice(0, 80);
  }

  private getMimeType(): string {
    switch (this.outputFormat) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Unable to create image blob'));
          return;
        }

        resolve(blob);
      }, type, quality);
    });
  }

  private async loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to load image'));
      image.src = source;
    });
  }

  private downloadBlob(blob: Blob, fileName: string) {
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  private formatDateStamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}-${hour}${minute}`;
  }

  private releasePreviewUrl() {
    if (!this.url) {
      return;
    }

    URL.revokeObjectURL(this.url);
    this.url = '';
    this.templateImage = null;
  }
}
