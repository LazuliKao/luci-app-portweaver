import { rpcClient, type WolWakeResponse } from "@/utils/rpc-client";
const form = L.form;

function validateMilliseconds(
  value: unknown,
  minimum: number,
  maximum: number,
): boolean | string {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    return _("Enter a whole number from %d to %d.").format(minimum, maximum);
  }
  return true;
}

function hasChanged(
  options: LuCI.form.AbstractValue[],
  sectionId: string,
): boolean {
  return options.some((option) => option.getUIElement(sectionId)?.isChanged());
}

function showWakeResult(result: WolWakeResponse): void {
  const message = _("WoL queued: %d, skipped: %d, failed: %d.").format(
    result.queued_count,
    result.skipped_count,
    result.failed_count,
  );
  L.ui.addNotification(
    null,
    <p>{message}</p>,
    result.failed_count ? "error" : "info",
  );
}

export default function (
  _m: LuCI.form.Map,
  s: LuCI.form.AbstractSection,
  tab_id: string,
) {
  const o = s.taboption(
    tab_id,
    form.SectionValue,
    "_wol_targets",
    form.GridSection,
    "wol_target",
  );

  const ss = o.subsection as LuCI.form.GridSection;
  const targetOptions: LuCI.form.AbstractValue[] = [];
  ss.anonymous = true;
  ss.addremove = true;
  ss.sortable = true;
  ss.cloneable = true;

  ss.sectiontitle = (section_id: string) =>
    (L.uci.get("portweaver", section_id, "name") as string) ||
    section_id ||
    _("Unnamed target");

  const oFlag = ss.option(form.Flag, "enabled", _("Enable"));
  oFlag.modalonly = false;
  oFlag.editable = true;
  oFlag.default = "1";
  oFlag.rmempty = false;
  targetOptions.push(oFlag);

  const oName = ss.option(form.Value, "name", _("Target Name"));
  oName.modalonly = true;
  oName.rmempty = false;
  oName.datatype = "string";
  oName.placeholder = "my_pc";
  oName.validate = (section_id: string, value: unknown) => {
    const val = String(value || "");
    if (!val || val.trim() === "") return _("Target name is required");
    if (!/^[a-zA-Z0-9_-]+$/.test(val.trim()))
      return _(
        "Target name must contain only alphanumeric characters, underscore, or hyphen",
      );

    const sections = L.uci.sections("portweaver", "wol_target");
    const trimmedValue = val.trim();
    for (const sec of sections) {
      if (sec[".name"] === section_id) continue;

      const existingName = sec.name as string;
      if (existingName && existingName.trim() === trimmedValue) {
        return _("Target name already exists. Please choose a different name.");
      }
    }

    return true;
  };
  targetOptions.push(oName);

  const oMacList = ss.option(
    form.DynamicList,
    "mac_addresses",
    _("MAC Addresses"),
    _("MAC addresses of machines to wake (e.g. AA:BB:CC:DD:EE:FF)."),
  );
  oMacList.modalonly = true;
  oMacList.rmempty = false;
  oMacList.datatype = "macaddr";
  targetOptions.push(oMacList);

  const oCooldown = ss.option(
    form.Value,
    "cooldown_ms",
    _("WoL Cooldown (ms)"),
    _(
      "Minimum interval between successive WoL packets in milliseconds (1000–300000).",
    ),
  );
  oCooldown.modalonly = true;
  oCooldown.rmempty = true;
  oCooldown.default = "30000";
  oCooldown.datatype = "uinteger";
  oCooldown.placeholder = "30000";
  oCooldown.validate = (_sectionId: string, value: unknown) =>
    validateMilliseconds(value, 1000, 300000);
  targetOptions.push(oCooldown);

  const oWakeDelay = ss.option(
    form.Value,
    "wake_delay_ms",
    _("Wake Delay (ms)"),
    _(
      "Wait after queuing a wake packet before the first target connection attempt (0–300000).",
    ),
  );
  oWakeDelay.modalonly = true;
  oWakeDelay.rmempty = true;
  oWakeDelay.default = "1000";
  oWakeDelay.datatype = "uinteger";
  oWakeDelay.validate = (_sectionId: string, value: unknown) =>
    validateMilliseconds(value, 0, 300000);
  targetOptions.push(oWakeDelay);

  const oRetryInterval = ss.option(
    form.Value,
    "retry_interval_ms",
    _("Retry Interval (ms)"),
    _(
      "Interval between target connection retries while the machine wakes (100–300000).",
    ),
  );
  oRetryInterval.modalonly = true;
  oRetryInterval.rmempty = true;
  oRetryInterval.default = "1000";
  oRetryInterval.datatype = "uinteger";
  oRetryInterval.validate = (_sectionId: string, value: unknown) =>
    validateMilliseconds(value, 100, 300000);
  targetOptions.push(oRetryInterval);

  const oRetryWindow = ss.option(
    form.Value,
    "retry_window_ms",
    _("Retry Window (ms)"),
    _("Maximum time to retry target connections after waking (1–300000)."),
  );
  oRetryWindow.modalonly = true;
  oRetryWindow.rmempty = true;
  oRetryWindow.default = "30000";
  oRetryWindow.datatype = "uinteger";
  oRetryWindow.validate = (_sectionId: string, value: unknown) =>
    validateMilliseconds(value, 1, 300000);
  targetOptions.push(oRetryWindow);

  oWakeDelay.validate = (sectionId: string, value: unknown) => {
    const validation = validateMilliseconds(value, 0, 300000);
    const retryWindow = Number(oRetryWindow.formvalue(sectionId));
    if (
      validation === true &&
      Number.isInteger(retryWindow) &&
      Number(value) > retryWindow
    ) {
      return _("Wake delay cannot exceed the retry window.");
    }
    return validation;
  };
  oRetryInterval.validate = (sectionId: string, value: unknown) => {
    const validation = validateMilliseconds(value, 100, 300000);
    const retryWindow = Number(oRetryWindow.formvalue(sectionId));
    if (
      validation === true &&
      Number.isInteger(retryWindow) &&
      Number(value) > retryWindow
    ) {
      return _("Retry interval cannot exceed the retry window.");
    }
    return validation;
  };
  oRetryWindow.validate = (sectionId: string, value: unknown) => {
    const validation = validateMilliseconds(value, 1, 300000);
    if (validation !== true) return validation;

    const retryWindow = Number(value);
    if (Number(oWakeDelay.formvalue(sectionId)) > retryWindow) {
      return _("Retry window must be at least the wake delay.");
    }
    if (Number(oRetryInterval.formvalue(sectionId)) > retryWindow) {
      return _("Retry window must be at least the retry interval.");
    }
    return true;
  };

  const oLogFlag = ss.option(
    form.Flag,
    "log_enabled",
    _("Enable Logging"),
    _("Record diagnostic logs when triggering WoL for this target."),
  );
  oLogFlag.modalonly = true;
  oLogFlag.default = "0";
  oLogFlag.rmempty = true;
  targetOptions.push(oLogFlag);

  const oActions = ss.option(form.DummyValue, "actions", _("Actions"));
  oActions.modalonly = false;
  oActions.textvalue = (section_id: string) => {
    const targetName = L.uci.get("portweaver", section_id, "name") as string;
    if (!targetName) return "";
    if (L.uci.get("portweaver", section_id, "enabled") === "0") {
      return _("Disabled");
    }

    const wakeBtn = (
      <button
        type="button"
        class="cbi-button cbi-button-action"
        onclick={() => {
          if (hasChanged(targetOptions, section_id)) {
            L.ui.addNotification(
              null,
              <p>
                {_(
                  "Save and reload the changed WoL configuration before waking a target.",
                )}
              </p>,
              "warning",
            );
            return;
          }
          rpcClient
            .wolWake(undefined, targetName)
            .then(showWakeResult)
            .catch((err: unknown) => {
              alert(_("WoL error: %s").format(String(err)));
            });
        }}
      >
        {_("Wake Now")}
      </button>
    ) as HTMLButtonElement;
    return wakeBtn;
  };
}
