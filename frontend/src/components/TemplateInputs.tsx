"use client";

import { TemplateId } from "../lib/milestoneTemplates";
import templateStyles from "./TemplateWizard.module.css";

interface TemplateInputsProps {
  templateId: TemplateId;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

export function TemplateInputs({ templateId, values, onChange }: TemplateInputsProps) {
  const update = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  switch (templateId) {
    case "evm.deployment_usage.v1":
      return (
        <div className={templateStyles.inputSection}>
          <label className={templateStyles.inputLabel}>Contract address</label>
          <input
            value={values.contractAddress}
            onChange={(e) => update("contractAddress", e.target.value)}
            placeholder="0x..."
            className={templateStyles.input}
          />
          <div className={templateStyles.inputRow}>
            <div>
              <label className={templateStyles.inputLabel}>Measurement window (seconds)</label>
              <input
                type="number"
                value={values.measurementWindowSeconds}
                onChange={(e) => update("measurementWindowSeconds", e.target.value)}
                className={templateStyles.input}
              />
            </div>
            <div>
              <label className={templateStyles.inputLabel}>Unique caller threshold</label>
              <input
                type="number"
                value={values.uniqueCallerThreshold}
                onChange={(e) => update("uniqueCallerThreshold", e.target.value)}
                className={templateStyles.input}
              />
            </div>
          </div>
        </div>
      );
    case "research.report.v1":
      return (
        <div className={templateStyles.inputSection}>
          <label className={templateStyles.inputLabel}>Deliverable hash</label>
          <input
            value={values.deliverableHash}
            onChange={(e) => update("deliverableHash", e.target.value)}
            placeholder="0x... (IPFS/0G root)"
            className={templateStyles.input}
          />
          <div className={templateStyles.inputRow}>
            <div>
              <label className={templateStyles.inputLabel}>Word count</label>
              <input
                type="number"
                value={values.wordCount}
                onChange={(e) => update("wordCount", e.target.value)}
                className={templateStyles.input}
              />
            </div>
            <div>
              <label className={templateStyles.inputLabel}>Citation count</label>
              <input
                type="number"
                value={values.citationCount}
                onChange={(e) => update("citationCount", e.target.value)}
                className={templateStyles.input}
              />
            </div>
            <div>
              <label className={templateStyles.inputLabel}>Source count</label>
              <input
                type="number"
                value={values.sourceCount}
                onChange={(e) => update("sourceCount", e.target.value)}
                className={templateStyles.input}
              />
            </div>
            <div>
              <label className={templateStyles.inputLabel}>Plagiarism %</label>
              <input
                type="number"
                value={values.plagiarismScore}
                onChange={(e) => update("plagiarismScore", e.target.value)}
                className={templateStyles.input}
              />
            </div>
          </div>
        </div>
      );
    case "marketing.campaign.v1":
      return (
        <div className={templateStyles.inputSection}>
          <label className={templateStyles.inputLabel}>Deliverable hash</label>
          <input
            value={values.deliverableHash}
            onChange={(e) => update("deliverableHash", e.target.value)}
            placeholder="0x... (Notion/Figma/0G root)"
            className={templateStyles.input}
          />
          <div className={templateStyles.inputRow}>
            <div>
              <label className={templateStyles.inputLabel}>Twitter impressions</label>
              <input
                type="number"
                value={values.twitterImpressions}
                onChange={(e) => update("twitterImpressions", e.target.value)}
                className={templateStyles.input}
              />
            </div>
            <div>
              <label className={templateStyles.inputLabel}>GA pageviews</label>
              <input
                type="number"
                value={values.gaPageviews}
                onChange={(e) => update("gaPageviews", e.target.value)}
                className={templateStyles.input}
              />
            </div>
            <div>
              <label className={templateStyles.inputLabel}>GA clicks</label>
              <input
                type="number"
                value={values.gaClicks}
                onChange={(e) => update("gaClicks", e.target.value)}
                className={templateStyles.input}
              />
            </div>
          </div>
        </div>
      );
    case "data.pipeline.v1":
      return (
        <div className={templateStyles.inputSection}>
          <label className={templateStyles.inputLabel}>Output file hash</label>
          <input
            value={values.fileHash}
            onChange={(e) => update("fileHash", e.target.value)}
            placeholder="0x... (S3/GCS/0G root)"
            className={templateStyles.input}
          />
          <div className={templateStyles.inputRow}>
            <div>
              <label className={templateStyles.inputLabel}>Row count</label>
              <input
                type="number"
                value={values.rowCount}
                onChange={(e) => update("rowCount", e.target.value)}
                className={templateStyles.input}
              />
            </div>
            <div>
              <label className={templateStyles.inputLabel}>Freshness timestamp</label>
              <input
                type="number"
                value={values.freshnessTimestamp}
                onChange={(e) => update("freshnessTimestamp", e.target.value)}
                placeholder="Unix seconds"
                className={templateStyles.input}
              />
            </div>
            <div>
              <label className={templateStyles.inputLabel}>Schema hash</label>
              <input
                value={values.schemaHash}
                onChange={(e) => update("schemaHash", e.target.value)}
                placeholder="0x..."
                className={templateStyles.input}
              />
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}
